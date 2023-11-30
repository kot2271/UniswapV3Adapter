import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

import { getSqrtPriceX96 } from "../utils/sqrtPriceX96";

task("getSqrtPrice", "Calculates sqrt price for Uniswap V3 pool")
  .addParam("reserve0", "Reserve of token0 in pool")
  .addParam("reserve1", "Reserve of token1 in pool")
  .setAction(
    async (
      taskArgs: TaskArguments,
      hre: HardhatRuntimeEnvironment
    ): Promise<void> => {
      const reserve0: string = taskArgs.reserve0;
      const reserve1: string = taskArgs.reserve1;

      const sqrtPriceX96 = getSqrtPriceX96(
        hre.ethers.utils.parseEther(reserve1),
        hre.ethers.utils.parseEther(reserve0)
      );

      console.log(`sqrtPriceX96: ${sqrtPriceX96.toString()}`);
    }
  );
