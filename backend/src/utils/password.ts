import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, SALT_ROUNDS);
export const comparePassword = (plain: string, hash: string): Promise<boolean> => bcrypt.compare(plain, hash);

// Compared against when the email is unknown, so login timing doesn't reveal which emails exist.
let dummyHash: string | undefined;
export const getDummyHash = async (): Promise<string> => (dummyHash ??= await hashPassword("not-a-real-password-1"));
