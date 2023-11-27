import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, BigNumberish } from "ethers";
import { UniswapV3Adapter } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getSqrtPriceX96 } from "../utils/sqrtPriceX96";

describe("UniswapV3Adapter", function () {
  const positionManagerAddress = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
  const swapRouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
  const token0Address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const token1Address = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const reserve0: BigNumber = ethers.utils.parseEther("2");
  const reserve1: BigNumber = ethers.utils.parseEther("5");
  const sqrtPriceX96 = getSqrtPriceX96(reserve1, reserve0);
  let accounts: SignerWithAddress[];
  let v3Adapter: UniswapV3Adapter;

  beforeEach(async function () {
    accounts = await ethers.getSigners();

    const UniswapV3Adapter = await ethers.getContractFactory(
      "UniswapV3Adapter"
    );
    v3Adapter = await UniswapV3Adapter.deploy(
      positionManagerAddress,
      swapRouterAddress
    );
    await v3Adapter.deployed();
  });

  describe("createPool", function () {
    it("should to be create a pool", async function () {
      const receipt = await v3Adapter.createPool(token0Address, token1Address, sqrtPriceX96);
      const filter = v3Adapter.filters.PoolCreated();
      const events = await v3Adapter.queryFilter(filter);

        const poolAddress = events[0].args["pool"];
        const token0 = events[0].args["token0"];
        const token1 = events[0].args["token1"];

      await expect(receipt)
        .to.emit(v3Adapter, "PoolCreated")
        .withArgs(poolAddress, token0, token1, v3Adapter.FEE);

      expect(await v3Adapter.pool()).to.eq(poolAddress);
    });
  });

  describe("mintNewPosition", function () {
    it.only("should mint a new uniswap position", async function () {
        console.log(`Balance: ${await ethers.provider.getBalance(v3Adapter.pool())}`)
  
  // Параметры 
  const poolFee: BigNumberish = 500;

  // Создание пула
  const pool = await v3Adapter.createPool(token0Address, token1Address, sqrtPriceX96);

    const filter = v3Adapter.filters.PoolCreated();
    const events = await v3Adapter.queryFilter(filter);
    const poolAddress = events[0].args["pool"];
    const token0 = events[0].args["token0"];
    const token1 = events[0].args["token1"];
    const fee = events[0].args["fee"];

  // Минт позиции
  const tx = await v3Adapter.mintNewPositions(
    token1Address, 
    token0Address,
    poolFee,
    reserve0,
    reserve1  
  );

    // const filter = v3Adapter.filters.PositionMinted();
    // const events = await v3Adapter.queryFilter(filter);

    // const tokenId = events[0].args["tokenId"];
    // const posotionOwner = events[0].args["owner"];
    // const liquidity = events[0].args["liquidity"];
    // const amount0 = events[0].args["amount0"];
    // const amount1 = events[0].args["amount1"];

  
  // Проверяем событие 
//   await expect(tx)
//     .to.emit(v3Adapter, "PositionMinted")
//     .withArgs(
//       tokenId, 
//       posotionOwner,  
//       liquidity,
//       amount0,
//       amount1
//     );
  
  // Проверяем данные позиции
//   const position = await v3Adapter.positions(tokenId);  
//   expect(position.owner).to.eq(posotionOwner);
//   expect(position.liquidity).to.eq(liquidity);
    });
  });
});
