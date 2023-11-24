// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "contracts/interfaces/INonfungiblePositionManager.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

contract UniswapV3Adapter {
    ISwapRouter public immutable swapRouter;
    INonfungiblePositionManager public immutable positionManager;

    int24 public constant MIN_TICK = -887270;
    int24 public constant MAX_TICK = 887270;
    uint24 public constant FEE = 500;

    address public pool;

    struct Position {
        address owner;
        address token0;
        address token1;
        uint256 amount0;
        uint256 amount1;
        uint128 liquidity;
    }

    // Хеш-таблица, в которой хранятся позиции.
    mapping(uint256 => Position) public positions;

    constructor(address _positionManager, address _swapRouter) {
        positionManager = INonfungiblePositionManager(_positionManager);
        swapRouter = ISwapRouter(_swapRouter);
        // nonfungiblePositionManager = INonfungiblePositionManager(
        //     0xC36442b4a4522E871399CD717aBDD847Ab11FE88
        // );
        // swapRouter = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);
    }

    function createPool(
        address token0,
        address token1,
        uint160 sqrtPriceX96
    ) external returns (address) {
        // адреса токенов упорядочены
        (address tokenA, address tokenB) = token0 < token1
            ? (token0, token1)
            : (token1, token0);

        pool = positionManager.createAndInitializePoolIfNecessary(
            tokenA,
            tokenB,
            FEE,
            sqrtPriceX96
        );
        return pool;
    }

    function mintNewPositions(
        address token0,
        address token1,
        uint24 poolFee,
        uint256 amount0ToMint,
        uint256 amount1ToMint
    )
        external
        returns (
            uint256 tokenId,
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        )
    {
        (address tokenA, address tokenB) = token0 < token1
            ? (token0, token1)
            : (token1, token0);
        (tokenId, liquidity, amount0, amount1) = positionManager.mint(
            INonfungiblePositionManager.MintParams({
                token0: tokenA,
                token1: tokenB,
                fee: poolFee,
                tickLower: MIN_TICK,
                tickUpper: MAX_TICK,
                amount0Desired: amount0ToMint,
                amount1Desired: amount1ToMint,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp + 600 seconds
            })
        );
        positions[tokenId] = Position({
            owner: msg.sender,
            token0: tokenA,
            token1: tokenB,
            amount0: amount0,
            amount1: amount1,
            liquidity: liquidity
        });
        return (tokenId, liquidity, amount0, amount1);
    }

    function collectAllFees(
        uint256 tokenId
    ) external returns (uint256 amount0, uint256 amount1) {
        Position memory position = positions[tokenId];
        require(msg.sender == position.owner, "Only owner can collect fees");
        (amount0, amount1) = positionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: msg.sender,
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );
        return (amount0, amount1);
    }

    function decreaseLiquidity(
        uint256 tokenId,
        uint128 liquidity
    ) external returns (uint256 amount0, uint256 amount1) {
        Position memory position = positions[tokenId];
        require(
            msg.sender == position.owner,
            "Only owner can decrease liquidity"
        );
        (amount0, amount1) = positionManager.decreaseLiquidity(
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: tokenId,
                liquidity: liquidity,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp + 600 seconds
            })
        );
        position.liquidity -= liquidity;

        return (amount0, amount1);
    }

    function increaseLiquidity(
        uint256 tokenId,
        uint256 amountAdd0,
        uint256 amountAdd1
    ) external returns (uint128 liquidity, uint256 amount0, uint256 amount1) {
        Position memory position = positions[tokenId];
        require(
            msg.sender == position.owner,
            "Only owner can increase liquidity"
        );
        (liquidity, amount0, amount1) = positionManager.increaseLiquidity(
            INonfungiblePositionManager.IncreaseLiquidityParams({
                tokenId: tokenId,
                amount0Desired: amountAdd0,
                amount1Desired: amountAdd1,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp + 600 seconds
            })
        );
        position.liquidity += liquidity;

        return (liquidity, amount0, amount1);
    }

    function swapExactInput(
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMinimum,
        bytes memory path
    ) external returns (uint256 amountOut) {
        TransferHelper.safeTransferFrom(
            tokenIn,
            msg.sender,
            address(this),
            amountIn
        );
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path,
                recipient: address(this),
                deadline: block.timestamp + 600 seconds,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum
            })
        );

        return amountOut;
    }

    function swapExactOutput(
        address tokenIn,
        uint256 amountOut,
        uint256 amountInMaximum,
        bytes memory path
    ) external returns (uint256 amountIn) {
        amountIn = swapRouter.exactOutput(
            ISwapRouter.ExactOutputParams({
                path: path,
                recipient: address(this),
                deadline: block.timestamp + 600 seconds,
                amountOut: amountOut,
                amountInMaximum: amountInMaximum
            })
        );
        TransferHelper.safeTransfer(
            tokenIn,
            msg.sender,
            amountIn
        );

        return amountIn;
    }
}
