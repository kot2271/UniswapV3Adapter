import { task } from "hardhat/config";
import { UniswapV3Adapter, TestToken } from "../typechain";
import { BigNumber } from "ethers";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

task("swapExactInput", "Swaps a fixed input amount")
  .addParam("contract", "The UniswapV3Adapter address")
  .addParam("tokenIn", "The token to swap")
  .addParam("amountIn", "Amount to swap")
  .addParam("tokenOut", "Received token")
  .addParam("amountOutMin", "Minimum amount to receive")
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

      const amountIn = hre.ethers.utils.parseEther(taskArgs.amountIn as string);
      const amountOutMin = hre.ethers.utils.parseEther(
        taskArgs.amountOutMin as string
      );

      const fee = taskArgs.fee as BigNumber;

      const pathIn: string = hre.ethers.utils.solidityPack(
        ["address", "uint24", "address"],
        [tokenIn.address, fee, tokenOut.address]
      );

      await v3Adapter.swapExactInput(
        tokenIn.address,
        amountIn,
        amountOutMin,
        pathIn
      );

      const filter = v3Adapter.filters.SwapExactInput();
      const events = await v3Adapter.queryFilter(filter);

      const txAmountIn = events[0].args["amountIn"];
      const txAmountOut = events[0].args["amountOut"];

      const amountInEth = hre.ethers.utils.formatEther(txAmountIn);
      const amountOutEth = hre.ethers.utils.formatEther(txAmountOut);

      console.log(
        `Swapped ${amountInEth} ${await tokenIn.symbol()} for ${amountOutEth} ${await tokenOut.symbol()}`
      );
    }
  );
