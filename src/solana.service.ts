// Client

import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction
} from "@solana/web3.js";



import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createInitializeMetadataPointerInstruction, createInitializeMintInstruction, ExtensionType, getMetadataPointerState, getMint, getMintLen, getOrCreateAssociatedTokenAccount, getTokenMetadata, LENGTH_SIZE, mintTo, TOKEN_2022_PROGRAM_ID, TYPE_SIZE } from "@solana/spl-token";
import { createInitializeInstruction, createUpdateFieldInstruction, pack, TokenMetadata } from "@solana/spl-token-metadata";
import { AxiosError } from "axios";
import * as bs58 from 'bs58';
import "dotenv/config";
import { catchError, firstValueFrom } from "rxjs";


@Injectable()
export class SolanaService {

  // Connection to devnet cluster
  public network: any = this.configService.get<string>('NETWORK')
  public connection: Connection = new Connection(clusterApiUrl(this.network), "confirmed");
  public totalSupplyToken: number;

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService
  ) {
    const decimals = '0'.repeat(Number(this.configService.get<string>('DECIMALS')))
    this.totalSupplyToken = Number(`${this.configService.get<string>('SUPPLY')}${decimals}`);
    this.createTokenSPL_V2();
  } 


  public async createTokenSPL_V2() {
    // Playground wallet

    //* Account Wallet
    const dec = bs58.decode(this.configService.get<string>('SECRET_KEY_ACCOUNT'));
    const payer = Keypair.fromSecretKey(dec);
    console.log("My address:", payer.publicKey.toString());
    const balance = await this.connection.getBalance(payer.publicKey);
    console.log(`My balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    
    //* Authority Accounts
    // Authority that can mint new tokens
    const accountMint = this.configService.get<string>('MINT_AUTHORITY_ACCOUNT');
    const mintAuthority = accountMint ? new PublicKey(accountMint) : payer.publicKey;
    // Authority that can update the metadata pointer and token metadata
    const accountUpdateMetadata = this.configService.get<string>('MINT_AUTHORITY_ACCOUNT');
    const updateAuthority = accountUpdateMetadata ? new PublicKey(accountMint) : payer.publicKey;
    // Generate new keypair for Mint Account
    const mintKeypair = Keypair.generate();
    // Address for Mint Account
    const mint = mintKeypair.publicKey;
    
    // Transaction to send
    let transaction: Transaction;
    // Transaction signature returned from sent transaction
    let transactionSignature: string;

    // 1. =======================================  Mint Setup ==================================================
    //* defina las propiedades de la cuenta Mint que crearemos en el siguiente paso.

    // Decimals for Mint Account
    const decimals = Number(this.configService.get<string>('DECIMALS'));
    
    // metadat
    const metadataUrl = this.configService.get<string>('METADATA_URL');
    const metadataData = (await firstValueFrom( 
      this.httpService.get(metadataUrl).pipe(
        catchError((error: AxiosError) => {
          console.error(error.response.data);
          throw 'An error happened!';
        }),
      ) 
    )).data;
    
    // Metadata to store in Mint Account
    const metaData: TokenMetadata = {
      updateAuthority: updateAuthority,
      mint: mint,
      name: metadataData['name'],
      symbol: metadataData['symbol'],
      uri: metadataUrl,
      additionalMetadata: metadataData['attributes'],
    };
    console.log(metadataData);
    

    // Size of Mint Account with extension
    const mintLen = getMintLen([ExtensionType.MetadataPointer]);
    // Size of MetadataExtension 2 bytes for type, 2 bytes for length
    const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
    // Size of metadata
    const metadataLen = pack(metaData).length;
    console.log('metadataLen', metadataLen);
    // Minimum lamports required for Mint Account
    const lamports = await this.connection.getMinimumBalanceForRentExemption(
      mintLen + metadataExtension + metadataLen,
    );


    // 2. ========================================== Build Instructions  ============================================

    const createAccountInstruction = SystemProgram.createAccount({
      fromPubkey: payer.publicKey, // Account that will transfer lamports to created account
      newAccountPubkey: mint, // direccion de la cuenta a crear
      space: mintLen, // cantidad de bytes para asignar la cuenta creada
      lamports, // Amount of lamports transferred a la cuenta creada
      programId: TOKEN_2022_PROGRAM_ID, // Program assigned as owner of created account
    });

    
    const initializeMetadataPointerInstruction = createInitializeMetadataPointerInstruction(
      mint, // Mint account address
      updateAuthority, // Authority that can set the metadata address
      mint, // address of the account containing the metadata
      TOKEN_2022_PROGRAM_ID,
    );

    //* Next, create the statement to initialize the rest of the Mint account data.
    const initializeMintInstruction = createInitializeMintInstruction(
      mint, // Mint account address
      decimals, // Decimals of Mint
      mintAuthority, // Authority account
      null, // Optional Freeze Authority
      TOKEN_2022_PROGRAM_ID, // Token Extension Program ID
    );

    //* Next, create the statement to initialize the TokenMetadata extension and the required metadata fields (name, token, URI).
    const initializeMetadataInstruction = createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID, // Token Extension Program as Metadata Program
      metadata: mint, // address of the account containing the metadata
      updateAuthority: updateAuthority, // Authority that can update the metadata
      mint: mint, // Mint Account address
      mintAuthority: mintAuthority, // Designated Mint Authority
      name: metaData.name,
      symbol: metaData.symbol,
      uri: metadataUrl,
    });

    //* Next, create the statement to update the metadata with a custom field
    //* using the UpdateFiel instructions of the token's metadata interface.
    // *  This statement will update the value of an existing field or add it (additional_metadata) if it does not already exist.
    //* Please note that you may need to reallocate more space to the account to accommodate the additional data.
    //* In this example, we assign all the lamports needed for the rental in advance when creating the account.
    const updateFieldInstruction1 = createUpdateFieldInstruction({
      programId: TOKEN_2022_PROGRAM_ID, // Token Extension Program as Metadata Program
      metadata: mint, // Account address that holds the metadata
      updateAuthority: updateAuthority, // Authority that can update the metadata
      field: metaData.additionalMetadata[0][0], // key
      value: metaData.additionalMetadata[0][1], // value
    });

    const updateFieldInstruction2 = createUpdateFieldInstruction({
      programId: TOKEN_2022_PROGRAM_ID, // Token Extension Program as Metadata Program
      metadata: mint, // Account address that holds the metadata
      updateAuthority: updateAuthority, // Authority that can update the metadata
      field: metaData.additionalMetadata[1][0], // key
      value: metaData.additionalMetadata[1][1], // value
    });

    const updateFieldInstruction3 = createUpdateFieldInstruction({
      programId: TOKEN_2022_PROGRAM_ID, // Token Extension Program as Metadata Program
      metadata: mint, // Account address that holds the metadata
      updateAuthority: updateAuthority, // Authority that can update the metadata
      field: metaData.additionalMetadata[2][0], // key
      value: metaData.additionalMetadata[2][1], // value
    });

    // 3. ========================================== SEND TRANSACTION  ============================================

    //* Then add the instructions to a new transaction and send it to the network. This will create a Mint account with
    //* (MetadataPointer) and (TokenMetadata) extensions enabled and will store the metadata in the Mint account.
    transaction = new Transaction().add(
      createAccountInstruction,
      initializeMetadataPointerInstruction,
      // note: The above instructions are required before initializing mint
      initializeMintInstruction,
      initializeMetadataInstruction,
      updateFieldInstruction1,
      updateFieldInstruction2,
      updateFieldInstruction3
    );
    
    // Send transaction
    transactionSignature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [payer, mintKeypair], // Signers
    );
  

    //! 4. ========================================== Read Metadata from Mint Account  ============================================
    //* Next, verify that the metadata has been stored in the Mint account.
    //* Start by finding the Mint account and reading the (MetadataPointer) extension part of the account data:
    const mintInfo = await getMint(
      this.connection,
      mint,
      "confirmed",
      TOKEN_2022_PROGRAM_ID,
    );
    console.log("\nmintInfo:", mintInfo);
    
    // Retrieve and log the metadata pointer state
    const metadataPointer = getMetadataPointerState(mintInfo);
    console.log("\nMetadata Pointer:", JSON.stringify(metadataPointer, null, 2))

    //* lea la parte de Metadatos de los datos de la cuenta:
    const metadata = await getTokenMetadata(
      this.connection,
      mint, // Mint Account address
    );
    console.log("\nMetadata:", JSON.stringify(metadata, null, 2));

    //* Create associate an account
    const AssociateTokenAccount = await getOrCreateAssociatedTokenAccount( 
      this.connection,   // Connection to use
      payer,   //Payer of the transaction and initialization fees
      mint,   // Mint associated with the account to set or verify
      mintAuthority,  // Owner of the account to set or verify
      false,  //Allow the owner account to be a PDA (Program Derived Address)
      null,  //Desired level of commitment for querying the state
      {},  //Options for confirming the transaction
      TOKEN_2022_PROGRAM_ID,  //SPL Token program account
      // ASSOCIATED_TOKEN_PROGRAM_ID  //SPL Associated Token program account
    );
    console.log('address token CREATED', AssociateTokenAccount.address);

    //* =========== Mint Tokens ===========================
    // Minting tokens is the process of issuing new tokens into circulation. 
    const minto = await mintTo(
      this.connection, 
      payer, // the account of the payer for the transaction
      mint, // the token mint that the new token account is associated with
      AssociateTokenAccount.address, //the token account that tokens will be minted to
      payer.publicKey, // the account authorized to mint tokens
      BigInt(this.totalSupplyToken), // the raw amount of tokens to mint outside of decimals.
      [payer],
      {},
      TOKEN_2022_PROGRAM_ID
    );

    console.log(
      "\nCreate Mint Account:",
      `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`,
    );
  
    console.log(
      `Created successfully `,
    );
  }

}


