import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { UniswapV3Adapter, TestToken } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { getSqrtPriceX96 } from "../utils/sqrtPriceX96";

describe("UniswapV3Adapter", function () {
  const positionManagerAddress = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
  const swapRouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
  const reserve0: BigNumber = ethers.utils.parseEther("2");
  const reserve1: BigNumber = ethers.utils.parseEther("5");
  const poolFee: BigNumber = BigNumber.from(500);
  const sqrtPriceX96 = getSqrtPriceX96(reserve1, reserve0);
  let accounts: SignerWithAddress[];
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let v3Adapter: UniswapV3Adapter;
  let pizzaToken: TestToken;
  let sushiToken: TestToken;

  beforeEach(async function () {
    accounts = await ethers.getSigners();
    owner = accounts[0];
    user = accounts[1];

    const UniswapV3Adapter = await ethers.getContractFactory(
      "UniswapV3Adapter"
    );
    v3Adapter = await UniswapV3Adapter.deploy(
      positionManagerAddress,
      swapRouterAddress
    );
    await v3Adapter.deployed();

    const TestToken = await ethers.getContractFactory("TestToken");
    pizzaToken = await TestToken.deploy("PizzaToken", "PiToken");
    sushiToken = await TestToken.deploy("SushiToken", "SuToken");
    await pizzaToken.deployed();
    await sushiToken.deployed();
  });

  describe("createPool", function () {
    it("should emit 'PoolCreated' event", async function () {
      const receipt = await v3Adapter.createPool(
        pizzaToken.address,
        sushiToken.address,
        sqrtPriceX96
      );
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
    beforeEach(async () => {
      await v3Adapter.createPool(
        pizzaToken.address,
        sushiToken.address,
        sqrtPriceX96
      );

      pizzaToken
        .connect(owner)
        .approve(v3Adapter.address, reserve1.add(reserve1.mul(2)));
      sushiToken
        .connect(owner)
        .approve(v3Adapter.address, reserve1.add(reserve1.mul(2)));

      await sushiToken.allowance(owner.address, v3Adapter.address);
      await pizzaToken.allowance(owner.address, v3Adapter.address);
    });

    it("should emit 'PositionMinted' event", async function () {
      const tx = await v3Adapter.mintNewPositions(
        pizzaToken.address,
        sushiToken.address,
        poolFee,
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

      await expect(tx)
        .to.emit(v3Adapter, "PositionMinted")
        .withArgs(tokenId, positionOwner, liquidity, amount0, amount1);

      const position = await v3Adapter.positions(tokenId);
      expect(position.owner).to.eq(positionOwner);
      expect(position.liquidity).to.eq(liquidity);
    });

    it("should approve and transfer the correct amount of token0", async function () {
      const amount0ToMint = ethers.utils.parseEther("1");
      const amount1ToMint = ethers.utils.parseEther("2");

      await pizzaToken.connect(owner).approve(v3Adapter.address, amount0ToMint.add(amount1ToMint));
      await sushiToken.connect(owner).approve(v3Adapter.address, amount0ToMint.add(amount1ToMint));

      const tx = await v3Adapter.mintNewPositions(
        pizzaToken.address,
        sushiToken.address,
        poolFee,
        amount0ToMint,
        amount1ToMint
      );
      const txFilter = v3Adapter.filters.PositionMinted();
      const txEvents = await v3Adapter.queryFilter(txFilter);
      const tokenId = txEvents[0].args["tokenId"];
      const amount0 = txEvents[0].args["amount0"];
      const amount1 = txEvents[0].args["amount1"];

      expect(await pizzaToken.allowance(v3Adapter.address, positionManagerAddress)).to.equal(0);

      const filter = pizzaToken.filters.Transfer();
      const events = await pizzaToken.queryFilter(filter);
      
      const position = await v3Adapter.positions(tokenId);
      
      expect(position.amount0).to.equal(amount0);
      expect(position.amount1).to.equal(amount1);
    });

    it("should approve and transfer the correct amount of token1", async function () {
      const amount0ToMint = ethers.utils.parseEther("1");
      const amount1ToMint = ethers.utils.parseEther("2");

      await pizzaToken.connect(owner).approve(v3Adapter.address, amount0ToMint.add(amount1ToMint));
      await sushiToken.connect(owner).approve(v3Adapter.address, amount1ToMint.add(amount0ToMint));

      await pizzaToken.connect(owner).transfer(v3Adapter.address, reserve1.add(reserve1.mul(2)));
      await sushiToken.connect(owner).transfer(v3Adapter.address, reserve1.add(reserve1.mul(2)));

      const tx = await v3Adapter.mintNewPositions(
        pizzaToken.address,
        sushiToken.address,
        poolFee,
        amount0ToMint,
        amount1ToMint
      );

      const txFilter = v3Adapter.filters.PositionMinted();
      const txEvents = await v3Adapter.queryFilter(txFilter);
      const tokenId = txEvents[0].args["tokenId"];
      const amount0 = txEvents[0].args["amount0"];
      const amount1 = txEvents[0].args["amount1"];

      expect(await sushiToken.allowance(v3Adapter.address, positionManagerAddress)).to.equal(0);

      const filter = sushiToken.filters.Transfer();
      const events = await sushiToken.queryFilter(filter);

      const position = await v3Adapter.positions(tokenId);

      expect(position.amount0).to.equal(amount0);
      expect(position.amount1).to.equal(amount1);
    });
  });

  describe("collectAllFees", () => {
    let tokenId: BigNumber;
    let amount0: BigNumber;
    let amount1: BigNumber;
    let posotionOwner: string;

    beforeEach(async () => {
      await v3Adapter.createPool(
        pizzaToken.address,
        sushiToken.address,
        sqrtPriceX96
      );

      pizzaToken
        .connect(owner)
        .approve(v3Adapter.address, reserve0.add(reserve1));
      sushiToken
        .connect(owner)
        .approve(v3Adapter.address, reserve0.add(reserve1));

      await sushiToken.allowance(owner.address, v3Adapter.address);
      await pizzaToken.allowance(owner.address, v3Adapter.address);

      await v3Adapter.mintNewPositions(
        pizzaToken.address,
        sushiToken.address,
        poolFee,
        reserve0,
        reserve1
      );

      const filter = v3Adapter.filters.PositionMinted();
      const events = await v3Adapter.queryFilter(filter);

      tokenId = events[0].args["tokenId"];
      posotionOwner = events[0].args["owner"];
      amount0 = events[0].args["amount0"];
      amount1 = events[0].args["amount1"];

      const amountIn = ethers.utils.parseEther("0.8");
      const amountOutMinimum = ethers.utils.parseEther("0.2");

      const pathIn = ethers.utils.solidityPack(
        ["address", "uint24", "address"],
        [pizzaToken.address, poolFee, sushiToken.address]
      );

      await v3Adapter.swapExactInput(
        pizzaToken.address,
        amountIn,
        amountOutMinimum,
        pathIn
      );

      const amountOut = ethers.utils.parseEther("0.5");
      const amountInMaximum = ethers.utils.parseEther("1");
      const pathOut = ethers.utils.solidityPack(
        ["address", "uint24", "address"],
        [sushiToken.address, poolFee, pizzaToken.address]
      );

      v3Adapter.swapExactOutput(
        pizzaToken.address,
        amountOut,
        amountInMaximum,
        pathOut
      );
    });

    it("should emit 'FeesCollected' event", async () => {
      await time.increase(3600);
      const tx = await v3Adapter.collectAllFees(tokenId);

      const txFilter = v3Adapter.filters.FeesCollected();
      const txEvents = await v3Adapter.queryFilter(txFilter);
      const txTokenId = txEvents[0].args["tokenId"];
      const txOwner = txEvents[0].args["owner"];
      const txAmount0 = txEvents[0].args["amount0"];
      const txAmount1 = txEvents[0].args["amount1"];

      await expect(tx)
        .to.emit(v3Adapter, "FeesCollected")
        .withArgs(txTokenId, txOwner, txAmount0, txAmount1);

      expect(txEvents[0].args["tokenId"]).to.eq(tokenId);
      expect(txEvents[0].args["owner"]).to.eq(posotionOwner);
    });

    it("should revert if the caller is not the owner", async () => {
      await expect(
        v3Adapter.connect(user).collectAllFees(tokenId)
      ).to.be.revertedWithCustomError(v3Adapter, "NotOwner");
    });
  });

  describe("increaseLiquidity", () => {
    let tokenId: BigNumber;
    const amountAdd0: BigNumber = ethers.utils.parseEther("0.5");
    const amountAdd1: BigNumber = ethers.utils.parseEther("1");

    beforeEach(async () => {
      await v3Adapter.createPool(
        pizzaToken.address,
        sushiToken.address,
        sqrtPriceX96
      );

      pizzaToken
        .connect(owner)
        .approve(v3Adapter.address, reserve0.add(reserve1));
      sushiToken
        .connect(owner)
        .approve(v3Adapter.address, reserve0.add(reserve1));

      await sushiToken.allowance(owner.address, v3Adapter.address);
      await pizzaToken.allowance(owner.address, v3Adapter.address);

      await v3Adapter.mintNewPositions(
        pizzaToken.address,
        sushiToken.address,
        poolFee,
        reserve0,
        reserve1
      );

      const filter = v3Adapter.filters.PositionMinted();
      const events = await v3Adapter.queryFilter(filter);

      tokenId = events[0].args["tokenId"];
    });

    it("should emit 'LiquidityIncreased' event", async () => {
      const tx = await v3Adapter.increaseLiquidity(
        tokenId,
        amountAdd0,
        amountAdd1
      );

      const txFilter = v3Adapter.filters.LiquidityIncreased();
      const txEvents = await v3Adapter.queryFilter(txFilter);
      const txTokenId = txEvents[0].args["tokenId"];
      const txOwner = txEvents[0].args["owner"];
      const liquidity = txEvents[0].args["liquidity"];
      const amount0 = txEvents[0].args["amount0"];
      const amount1 = txEvents[0].args["amount1"];

      const position = await v3Adapter.positions(tokenId);

      expect(position.liquidity).to.eq(liquidity);
      expect(txTokenId).to.eq(tokenId);
      expect(txOwner).to.eq(owner.address);

      await expect(tx)
        .to.emit(v3Adapter, "LiquidityIncreased")
        .withArgs(txTokenId, txOwner, liquidity, amount0, amount1);
    });

    it("should revert if the caller is not the owner", async () => {
      await expect(
        v3Adapter
          .connect(user)
          .increaseLiquidity(tokenId, amountAdd0, amountAdd1)
      ).to.be.revertedWithCustomError(v3Adapter, "NotOwner");
    });
  });

  describe("decreaseLiquidity", () => {
    let tokenId: BigNumber;
    let liquidity: BigNumber;

    beforeEach(async () => {
      await v3Adapter.createPool(
        pizzaToken.address,
        sushiToken.address,
        sqrtPriceX96
      );

      pizzaToken
        .connect(owner)
        .approve(v3Adapter.address, reserve0.add(reserve1));
      sushiToken
        .connect(owner)
        .approve(v3Adapter.address, reserve0.add(reserve1));

      await sushiToken.allowance(owner.address, v3Adapter.address);
      await pizzaToken.allowance(owner.address, v3Adapter.address);

      await v3Adapter.mintNewPositions(
        pizzaToken.address,
        sushiToken.address,
        poolFee,
        reserve0,
        reserve1
      );

      const filter = v3Adapter.filters.PositionMinted();
      const events = await v3Adapter.queryFilter(filter);

      tokenId = events[0].args["tokenId"];
      liquidity = events[0].args["liquidity"];
    });

    it("should emit 'LiquidityDecreased' event", async () => {
      const tx = await v3Adapter.decreaseLiquidity(
        tokenId,
        liquidity.sub(30000)
      );

      const txFilter = v3Adapter.filters.LiquidityDecreased();
      const txEvents = await v3Adapter.queryFilter(txFilter);
      const txTokenId = txEvents[0].args["tokenId"];
      const txOwner = txEvents[0].args["owner"];
      const txLiquidity = txEvents[0].args["liquidity"];
      const amount0 = txEvents[0].args["amount0"];
      const amount1 = txEvents[0].args["amount1"];

      const positions = await v3Adapter.positions(tokenId);

      expect(positions.liquidity).to.eq(txLiquidity);

      await expect(tx)
        .to.emit(v3Adapter, "LiquidityDecreased")
        .withArgs(txTokenId, txOwner, txLiquidity, amount0, amount1);
    });

    it("should revert if the caller is not the owner", async () => {
      await expect(
        v3Adapter.connect(user).decreaseLiquidity(tokenId, liquidity)
      ).to.be.revertedWithCustomError(v3Adapter, "NotOwner");
    });
  });

  describe("swapExactInput", () => {
    let amountIn: BigNumber;
    let amountOutMinimum: BigNumber;
    let pathIn: string;

    beforeEach(async () => {
      amountIn = ethers.utils.parseEther("1.0");
      amountOutMinimum = ethers.utils.parseEther("0.2");

      await v3Adapter.createPool(
        pizzaToken.address,
        sushiToken.address,
        sqrtPriceX96
      );

      pizzaToken
        .connect(owner)
        .approve(v3Adapter.address, reserve0.add(reserve1));
      sushiToken
        .connect(owner)
        .approve(v3Adapter.address, reserve0.add(reserve1));

      await sushiToken.allowance(owner.address, v3Adapter.address);
      await pizzaToken.allowance(owner.address, v3Adapter.address);

      await v3Adapter.mintNewPositions(
        pizzaToken.address,
        sushiToken.address,
        poolFee,
        reserve0,
        reserve1
      );

      pathIn = ethers.utils.solidityPack(
        ["address", "uint24", "address"],
        [pizzaToken.address, poolFee, sushiToken.address]
      );
    });

    it("should emit 'SwapExactInput' event", async () => {
      const tx = await v3Adapter.swapExactInput(
        pizzaToken.address,
        amountIn,
        amountOutMinimum,
        pathIn
      );

      const txFilter = v3Adapter.filters.SwapExactInput();
      const txEvents = await v3Adapter.queryFilter(txFilter);
      const txAmountIn = txEvents[0].args["amountIn"];
      const amountOut = txEvents[0].args["amountOut"];

      await expect(tx)
        .to.emit(v3Adapter, "SwapExactInput")
        .withArgs(pizzaToken.address, txAmountIn, amountOut);
    });
  });

  describe("swapExactOutput", () => {
    let amountOut: BigNumber;
    let amountInMaximum: BigNumber;
    let pathOut: string;

    beforeEach(async () => {
      amountOut = ethers.utils.parseEther("0.5");
      amountInMaximum = ethers.utils.parseEther("1");

      await v3Adapter.createPool(
        pizzaToken.address,
        sushiToken.address,
        sqrtPriceX96
      );

      pizzaToken
        .connect(owner)
        .approve(v3Adapter.address, reserve0.mul(reserve1.mul(2)));
      sushiToken
        .connect(owner)
        .approve(v3Adapter.address, reserve0.mul(reserve1.mul(2)));

      await sushiToken.allowance(owner.address, v3Adapter.address);
      await pizzaToken.allowance(owner.address, v3Adapter.address);

      await v3Adapter.mintNewPositions(
        pizzaToken.address,
        sushiToken.address,
        poolFee,
        reserve0,
        reserve1
      );

      const amountIn = ethers.utils.parseEther("0.8");
      const amountOutMinimum = ethers.utils.parseEther("0.2");

      const pathIn = ethers.utils.solidityPack(
        ["address", "uint24", "address"],
        [pizzaToken.address, poolFee, sushiToken.address]
      );

      await v3Adapter.swapExactInput(
        pizzaToken.address,
        amountIn,
        amountOutMinimum,
        pathIn
      );

      pathOut = ethers.utils.solidityPack(
        ["address", "uint24", "address"],
        [pizzaToken.address, poolFee, sushiToken.address]
      );
    });

    it("should emit 'swapExactOutput' event", async () => {
      const tx = await v3Adapter.swapExactOutput(
        sushiToken.address,
        amountOut,
        amountInMaximum,
        pathOut
      );
      const txFilter = v3Adapter.filters.SwapExactOutput();
      const txEvents = await v3Adapter.queryFilter(txFilter);
      const txAmountIn = txEvents[0].args["amountIn"];

      await expect(tx)
        .to.emit(v3Adapter, "SwapExactOutput")
        .withArgs(sushiToken.address, txAmountIn, amountOut);
    });
  });

  describe("TestToken", function () {
    it("should set the correct owner", async function () {
      expect(await pizzaToken.owner()).to.equal(owner.address);
      expect(await sushiToken.owner()).to.equal(owner.address);
    });

    it("should mint initial supply to the owner", async function () {
      const pizzaTokenBalance = await pizzaToken.balanceOf(owner.address);
      expect(pizzaTokenBalance).to.equal(ethers.utils.parseEther("20"));

      const sushiTokenBalance = await pizzaToken.balanceOf(owner.address);
      expect(sushiTokenBalance).to.equal(ethers.utils.parseEther("20"));
    });

    it("should mint new pizzaTokens", async function () {
      await pizzaToken.mint(user.address, ethers.utils.parseEther("1"));
      const balance = await pizzaToken.balanceOf(user.address);
      expect(balance).to.equal(ethers.utils.parseEther("1"));
    });

    it("should mint new sushiTokens", async function () {
      await sushiToken.mint(user.address, ethers.utils.parseEther("1"));
      const balance = await sushiToken.balanceOf(user.address);
      expect(balance).to.equal(ethers.utils.parseEther("1"));
    });

    it("should revert if a non-owner tries to mint pizzaTokens", async function () {
      await expect(
        pizzaToken.connect(user).mint(user.address, ethers.utils.parseEther("1"))
      ).to.be.revertedWith("TestToken: must have admin role to mint");
    });

    it("should revert if a non-owner tries to mint sushiTokens", async function () {
      await expect(
        sushiToken.connect(user).mint(user.address, ethers.utils.parseEther("1"))
      ).to.be.revertedWith("TestToken: must have admin role to mint");
    });
  });
});
