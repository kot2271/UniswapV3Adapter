import { task } from "hardhat/config";
import { UniswapV3Adapter } from "../typechain";
import { BigNumber } from "ethers";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

task("decreaseLiquidity", "Decreases position liquidity")
  .addParam("contract", "The UniswapV3Adapter address")
  .addParam("tokenId", "Minted token with id")
  .addParam("liquidity", "Liquidity to decrease")
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
      const liquidity: BigNumber = taskArgs.liquidity;

      await v3Adapter.decreaseLiquidity(tokenId, liquidity);
      const filter = v3Adapter.filters.LiquidityDecreased();
      const events = await v3Adapter.queryFilter(filter);

      const txTokenId = events[0].args["tokenId"];
      const txOwner = events[0].args["owner"];
      const txLiquidity = events[0].args["liquidity"];
      const amount0 = events[0].args["amount0"];
      const amount1 = events[0].args["amount1"];

      const amount0Eth = hre.ethers.utils.formatEther(amount0);
      const amount1Eth = hre.ethers.utils.formatEther(amount1);

      console.log(
        `Liquidity decreased by ${txLiquidity} with tokenId ${txTokenId}`
      );
      console.log(`Position owner: ${txOwner}`);
      console.log(`Withdrawn:
      Token A: ${amount0Eth}
      Token B: ${amount1Eth}
    `);
    }
  );
