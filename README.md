# UniswapV3 protocol adapter

[![PizzaToken](https://img.shields.io/badge/check_the_PizzaToken_in_mumbai.polygonscan-ae6056?style=flat&logo=ethereum)](https://mumbai.polygonscan.com/token/0x9c1ca3c8f82465d220c8e8b5f28b3eae462d0d60)

[![SushiToken](https://img.shields.io/badge/check_the_SushiToken_in_mumbai.polygonscan-fe6f5e?style=flat&logo=ethereum)](https://mumbai.polygonscan.com/token/0xafc7aad956af6b4d11517f200a0775557e4fc68d)

[![UniswapV3](https://img.shields.io/badge/check_the_UniswapV3_protocol_adapter_in_mumbai.polygonscan-9966cc?style=flat&logo=ethereum)](https://mumbai.polygonscan.com/address/0x452d310ABb88B6F7451254DA51B82f0413f176a0)

## Installation

Clone the repository using the following command:
Install the dependencies using the following command:
```shell
npm i
```

## Deployment

Fill in all the required environment variables(copy .env-example to .env and fill it). 

Deploy contract to the chain (polygon-mumbai):
```shell
npx hardhat run scripts/deploy/deploy.ts --network polygonMumbai
```

## Verify

Verify the installation by running the following command:
```shell
npx hardhat verify --network polygonMumbai {CONTRACT_ADDRESS}
```

## Tasks

Create a new task(s) and save it(them) in the folder "tasks". Add a new task_name in the file "tasks/index.ts"

Running a getSqrtPrice task:
```shell
npx hardhat getSqrtPrice --reserve0 {AMOUNT_IN_ETHER} --reserve1 {AMOUNT_IN_ETHER} --network polygonMumbai
```

Running a createPool task:
```shell
npx hardhat createPool --contract {V3_ADAPTER_ADDRESS} --token-a {TOKEN_A_ADDRESS} --token-b {TOKEN_B_ADDRESS} --sqrt-price {SQRT_PRICE_X96} --network polygonMumbai
```

Running a mintNewPosition task:
```shell
npx hardhat mintNewPosition --contract {V3_ADAPTER_ADDRESS} --token-a {TOKEN_A_ADDRESS} --token-b {TOKEN_B_ADDRESS} --fee {POOL_FEE} --reserve0 {AMOUNT_IN_ETHER} --reserve1 {AMOUNT_IN_ETHER} --network polygonMumbai
```

Running a increaseLiquidity task:
```shell
npx hardhat increaseLiquidity --contract {V3_ADAPTER_ADDRESS} --token-id {MINTED_TOKEN_ID} --amount-a {AMOUNT_ADD_0} --amount-b {AMOUNT_ADD_1} --network polygonMumbai
```

Running a decreaseLiquidity task:
```shell
npx hardhat decreaseLiquidity --contract {V3_ADAPTER_ADDRESS} --token-id {MINTED_TOKEN_ID} --liquidity {REDUCTION_VALUE} --network polygonMumbai
```

Running a swapExactInput task:
```shell
npx hardhat swapExactInput --contract {V3_ADAPTER_ADDRESS} --token-in {TOKEN_A_ADDRESS} --amount-in {AMOUNT_IN_ETHER} --token-out {TOKEN_B_ADDRESS} --amount-out-min {AMOUNT_IN_ETHER} --fee {POOL_FEE} --network polygonMumbai
```

Running a swapExactOutput task:
```shell
npx hardhat swapExactOutput --contract {V3_ADAPTER_ADDRESS} --token-in {TOKEN_A_ADDRESS} --amount-out {AMOUNT_IN_ETHER} --token-out {TOKEN_B_ADDRESS} --amount-in-max {AMOUNT_IN_ETHER} --fee {POOL_FEE} --network polygonMumbai
```

Running a collectAllFees task:
```shell
npx hardhat collectAllFees --contract {V3_ADAPTER_ADDRESS} --token-id {MINTED_TOKEN_ID} --network polygonMumbai
```
#### Command execution log:
UniswapV3Adapter at 0x452d310ABb88B6F7451254DA51B82f0413f176a0
PizzaToken (PiToken): 0x9c1cA3C8F82465D220C8E8b5f28b3EaE462d0d60
SushiToken (SuToken): 0xafc7aad956AF6b4d11517F200A0775557E4fc68d
sqrtPriceX96: 125270724187523965593250732005

Pool address: 0x3F6ea59aE40e018101F846e3a01350Ebd2f44598
Token0: 0x9c1cA3C8F82465D220C8E8b5f28b3EaE462d0d60
Token1: 0xafc7aad956AF6b4d11517F200A0775557E4fc68d
Fee: 500

Minted token 195698 with liquidity 3162277660168379332
Position owner: 0x28217F6A9AeBa48042E814e9fa8004Ecf5f90873
amount0: 2.0 ETH
amount1: 5.0 ETH

Liquidity increased by 3794733192202055198 with tokenId 195698
Position owner: 0x28217F6A9AeBa48042E814e9fa8004Ecf5f90873
Amount0: 0.4 ETH
Amount1: 1.0 ETH

Liquidity decreased by 100000 with tokenId 195698
Position owner: 0x28217F6A9AeBa48042E814e9fa8004Ecf5f90873
Withdrawn:
      Token A: 2.399999999999936753
      Token B: 5.999999999999841885
      
Swapped 0.5 PiToken for 0.555432064462399424 SuToken

Spent 0.356010269697291817 PiToken to get 0.4 SuToken

Collecting fees for token 195698...

Collected fees:
      PizzaToken: 2.400249999999936755 PiToken's
      SushiToken: 6.000178005134690531 SuToken's