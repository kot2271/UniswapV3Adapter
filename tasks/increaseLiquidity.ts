import { task } from "hardhat/config";
import { UniswapV3Adapter, TestToken } from "../typechain";
import { BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

task("increaseLiquidity", "Increases position liquidity")
  .addParam("contract", "The UniswapV3Adapter address")
  .addParam("tokenId", "Minted token with id")
  .addParam("amountA", "tokenA amount")
  .addParam("amountB", "tokenA amount")
  .setAction(
    async (
      taskArgs: TaskArguments,
      hre: HardhatRuntimeEnvironment
    ): Promise<void> => {
      const v3Adapter: UniswapV3Adapter = <UniswapV3Adapter>(
        await hre.ethers.getContractAt(
          "UniswapV3Adapter",
          taskArgs.contract as string
        )
      );

      const tokenId: BigNumber = taskArgs.tokenId;
      const position = await v3Adapter.positions(tokenId);
      const tokenA: TestToken = <TestToken>(
        await hre.ethers.getContractAt("TestToken", position.token0 as string)
      );

      const tokenB: TestToken = <TestToken>(
        await hre.ethers.getContractAt("TestToken", position.token1 as string)
      );

      const amountA = hre.ethers.utils.parseEther(taskArgs.amountA as string);
      const amountB = hre.ethers.utils.parseEther(taskArgs.amountB as string);

      const accounts: SignerWithAddress[] = await hre.ethers.getSigners();

      const owner: SignerWithAddress = accounts[0];

      await tokenA.approve(v3Adapter.address, amountA.add(amountB));
      await tokenB.approve(v3Adapter.address, amountB.add(amountA));

      await tokenA.allowance(owner.address, v3Adapter.address);
      await tokenB.allowance(owner.address, v3Adapter.address);

      await v3Adapter.increaseLiquidity(tokenId, amountA, amountB);
      const filter = v3Adapter.filters.LiquidityIncreased();
      const events = await v3Adapter.queryFilter(filter);

      const txTokenId = events[0].args["tokenId"];
      const txOwner = events[0].args["owner"];
      const liquidity = events[0].args["liquidity"];
      const amount0 = events[0].args["amount0"];
      const amount1 = events[0].args["amount1"];

      const amount0Eth = hre.ethers.utils.formatEther(amount0);
      const amount1Eth = hre.ethers.utils.formatEther(amount1);

      console.log(
        `Liquidity increased by ${liquidity} with tokenId ${txTokenId}`
      );
      console.log(`Position owner: ${txOwner}`);
      console.log(`Amount0: ${amount0Eth} ETH`);
      console.log(`Amount1: ${amount1Eth} ETH`);
    }
  );
