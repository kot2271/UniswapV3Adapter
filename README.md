# UniswapV3 protocol adapter

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