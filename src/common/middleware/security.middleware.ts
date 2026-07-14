import { Request, Response, NextFunction } from "express";
import { genSalt, hash as _hash } from "bcrypt";
import { compare } from "bcrypt";

import pkg, { JwtPayload } from "jsonwebtoken";
const { verify } = pkg;
import { env } from "../config/env.config.js";

type UserFinder = (id: string) => Promise<any | null>;

interface RequestBody {
    password?: string;
}

class Security {
    async hashPassword(req: Request<{}, {}, RequestBody>, res: Response, next: NextFunction) {
        const { password } = req.body;

        if (password) {
            const salt = await genSalt(12);
            const hash = await _hash(password, salt);
            req.body.password = hash;
            return next();
        }

        next();
    }

    async protectSession(req: Request, res: Response, next: NextFunction, findUser: UserFinder) {
        let token: string | undefined;

        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return next(new Error("Invalid session"));
        }

        try {
            const decrypt = await new Promise<JwtPayload>((resolve, reject) => {
                verify(token, env.jwtSecret, (err, decoded) => {
                    if (err) reject(err);
                    else resolve(decoded as JwtPayload);
                });
            });

            const user = await findUser(decrypt.id);

            if (!user) {
                return next(new Error("The owner of this token doesn't exist anymore"));
            }

            req.user = user;
            next();
        } catch (error) {
            return next(new Error("Invalid token"));
        }
    }

    async protectUserAccounts(req: Request, res: Response, next: NextFunction) {
        const { id } = req.params;
        const { user } = req;

        if (user && id !== user.id) {
            return next(new Error("This account does not belong to you"));
        }

        next();
    }

    async comparePassword(password: string, userPassword: string): Promise<boolean> {
        const isValid = await compare(password, userPassword);
        if (!isValid) {
            throw new Error("Invalid credentials");
        }
        return true;
    }
}

const security: Security = new Security();
export { security };
