import { task } from "hardhat/config";
import { UniswapV3Adapter, TestToken } from "../typechain";
import { BigNumber } from "ethers";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

task("swapExactOutput", "Swaps to a fixed output amount")
  .addParam("contract", "The UniswapV3Adapter address")
  .addParam("tokenIn", "The token to swap")
  .addParam("amountOut", "Amount to swap")
  .addParam("tokenOut", "Received token")
  .addParam("amountInMax", "The maximum amount to be swapped")
  .addParam("fee", "the pool fee")
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

      const tokenIn: TestToken = <TestToken>(
        await hre.ethers.getContractAt("TestToken", taskArgs.tokenIn as string)
      );

      const tokenOut: TestToken = <TestToken>(
        await hre.ethers.getContractAt("TestToken", taskArgs.tokenOut as string)
      );

      const amountOut = hre.ethers.utils.parseEther(
        taskArgs.amountOut as string
      );
      const amountInMax = hre.ethers.utils.parseEther(
        taskArgs.amountInMax as string
      );

      const fee = taskArgs.fee as BigNumber;

      const pathOut: string = hre.ethers.utils.solidityPack(
        ["address", "uint24", "address"],
        [tokenIn.address, fee, tokenOut.address]
      );

      await v3Adapter.swapExactOutput(
        tokenOut.address,
        amountOut,
        amountInMax,
        pathOut
      );

      const filter = v3Adapter.filters.SwapExactOutput();
      const events = await v3Adapter.queryFilter(filter);

      const txAmountIn = events[0].args["amountIn"];
      const txAmountOut = events[0].args["amountOut"];

      const amountInEth = hre.ethers.utils.formatEther(txAmountIn);
      const amountOutEth = hre.ethers.utils.formatEther(txAmountOut);

      console.log(
        `Spent ${amountInEth} ${await tokenIn.symbol()} to get ${amountOutEth} ${await tokenOut.symbol()}`
      );
    }
  );
