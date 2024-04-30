import { ConfirmOptions, Connection, PublicKey, Signer } from "@solana/web3.js";

export class CreateMintObj{
    connection: Connection;
    payer: Signer;
    mintAuthority: PublicKey;
    freezeAuthority: PublicKey | null;
    decimals: number;
    confirmOptions?: ConfirmOptions;
    // keypair = Keypair.generate();
    // programId = TOKEN_PROGRAM_ID
}