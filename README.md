<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

# Create an ERC20 token in solana

1. run the following command to bring the necessary libraries

```
  npm install
```

2. have a public image of the token logo hosted in the cloud. For example this [Image](https://github.com/viktorhugo/public_images/assets/14018194/9284123d-3f10-4fbe-bbd2-51ac08b940f2) hosted on github.

3. You also need to have the metadata of the new token hosted. Here is an [example](https://viktorhugo.github.io/developers/metadata.json) (The attributes can vary depending on what you need):

```json
  {
    "name": "CAPY",
    "symbol": "CAPY",
    "description": "Only Possible On Solana",
    "image": "https://github.com/viktorhugo/public_images/assets/14018194/9284123d-3f10-4fbe-bbd2-51ac08b940f2",
    "attributes": [
      ["description", "Capybara Token Currency"],
      ["autor", "Victor hugo mosquera A."],
      ["company", "VmBross"]
    ]
  }
```

  4. Configure environment variables

  ```
  SECRET_KEY_ACCOUNT -> owner secret account
  SUPPLY -> amount of tokens to mint outside of decimals.
  DECIMALS -> total decimals token
  METADATA_URL -> url of the referenced hosted metadata
  NETWORK -> network name
```

5. If you want to set up an account with Authority that can mint new tokens You can add the following parameter in the `.env` file `MINT_AUTHORITY_ACCOUNT` with the account you want
6. If you want to set up an account with Authority that can update the metadata pointer and token metadata You can add the following parameter in the `.env` file `UPDATE_METADATA_AUTHORITY_ACCOUNT` with the account you want
