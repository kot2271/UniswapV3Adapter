import { task } from "hardhat/config";
import { UniswapV3Adapter, TestToken } from "../typechain";
import { BigNumber } from "ethers";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

task("createPool", "Creating a new pool")
  .addParam("contract", "The UniswapV3Adapter address")
  .addParam("tokenA", "addres tokenA")
  .addParam("tokenB", "addres tokenB")
  .addParam("sqrtPrice")
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

      const tokenA: TestToken = <TestToken>(
        await hre.ethers.getContractAt("TestToken", taskArgs.tokenA as string)
      );

      const tokenB: TestToken = <TestToken>(
        await hre.ethers.getContractAt("TestToken", taskArgs.tokenB as string)
      );

      const sqrtPrice: BigNumber = taskArgs.sqrtPrice;

      await v3Adapter.createPool(tokenA.address, tokenB.address, sqrtPrice);
      const filter = v3Adapter.filters.PoolCreated();
      const events = await v3Adapter.queryFilter(filter);

      const poolAddress = events[0].args["pool"];
      const token0 = events[0].args["token0"];
      const token1 = events[0].args["token1"];
      const fee = events[0].args["fee"];

      console.log("Pool created!");
      console.log(`Pool address: ${poolAddress}`);
      console.log(`Token0: ${token0}`);
      console.log(`Token1: ${token1}`);
      console.log(`Fee: ${fee}`);
    }
  );
