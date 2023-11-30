import { task } from "hardhat/config";
import { UniswapV3Adapter, TestToken } from "../typechain";
import { BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

task("mintNewPosition", "Mints a new position")
  .addParam("contract", "The UniswapV3Adapter address")
  .addParam("tokenA", "addres tokenA")
  .addParam("tokenB", "addres tokenB")
  .addParam("fee", "the pool fee")
  .addParam("reserve0", "Reserve of token0 in pool")
  .addParam("reserve1", "Reserve of token1 in pool")
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

      const fee: BigNumber = taskArgs.fee;
      const reserve0: BigNumber = hre.ethers.utils.parseEther(
        taskArgs.reserve0 as string
      );
      const reserve1: BigNumber = hre.ethers.utils.parseEther(
        taskArgs.reserve1 as string
      );

      const accounts: SignerWithAddress[] = await hre.ethers.getSigners();

      const owner: SignerWithAddress = accounts[0];

      tokenA
        .connect(owner)
        .approve(v3Adapter.address, reserve1.add(reserve1.mul(2)));
      tokenB
        .connect(owner)
        .approve(v3Adapter.address, reserve0.add(reserve0.mul(2)));

      await tokenA.allowance(owner.address, v3Adapter.address);
      await tokenB.allowance(owner.address, v3Adapter.address);

      await v3Adapter.mintNewPositions(
        tokenA.address,
        tokenB.address,
        fee,
        reserve0,
        reserve1
      );
      const filter = v3Adapter.filters.PositionMinted();
      const events = await v3Adapter.queryFilter(filter);

      const tokenId = events[0].args["tokenId"];
      const positionOwner = events[0].args["owner"];
      const liquidity = events[0].args["liquidity"];
      const amount0 = events[0].args["amount0"];
      const amount1 = events[0].args["amount1"];

      const amount0Eth = hre.ethers.utils.formatEther(amount0);
      const amount1Eth = hre.ethers.utils.formatEther(amount1);

      console.log(`Minted token with id: ${tokenId}, liquidity: ${liquidity}`);
      console.log(`Position owner: ${positionOwner}`);
      console.log(`Amount0: ${amount0Eth} ETH`);
      console.log(`Amount1: ${amount1Eth} ETH`);
    }
  );
