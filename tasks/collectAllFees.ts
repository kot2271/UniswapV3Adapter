import { task } from "hardhat/config";
import { UniswapV3Adapter, TestToken } from "../typechain";
import { BigNumber } from "ethers";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

task("collectAllFees", "Collects all accumulated fees for a position")
  .addParam("contract", "The UniswapV3Adapter address")
  .addParam("tokenId", "The position token ID")
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

      const tokenId = taskArgs.tokenId as BigNumber;

      const position = await v3Adapter.positions(tokenId);

      const tokenA: TestToken = <TestToken>(
        await hre.ethers.getContractAt("TestToken", position.token0 as string)
      );

      const tokenB: TestToken = <TestToken>(
        await hre.ethers.getContractAt("TestToken", position.token1 as string)
      );

      console.log(`Collecting fees for token ${tokenId}...`);

      await v3Adapter.collectAllFees(tokenId);

      const filter = v3Adapter.filters.FeesCollected();
      const events = await v3Adapter.queryFilter(filter);

      const txAmount0 = events[0].args["amount0"];
      const txAmount1 = events[0].args["amount1"];

      const amount0Eth = hre.ethers.utils.formatEther(txAmount0);
      const amount1Eth = hre.ethers.utils.formatEther(txAmount1);

      const tokenAName = await tokenA.name();
      const tokenBName = await tokenB.name();

      const tokenASymbol = await tokenA.symbol();
      const tokenBSymbol = await tokenB.symbol();

      console.log(`Collected fees:
      ${tokenAName}: ${amount0Eth} ${tokenASymbol}'s
      ${tokenBName}: ${amount1Eth} ${tokenBSymbol}'s
    `);
    }
  );
