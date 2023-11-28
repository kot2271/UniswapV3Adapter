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

    error NotOwner(uint256 tokenId);

    event PoolCreated(
        address indexed pool,
        address token0,
        address token1,
        uint24 fee
    );
    event PositionMinted(
        uint256 indexed tokenId,
        address indexed owner,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );
    event FeesCollected(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 amount0,
        uint256 amount1
    );
    event LiquidityDecreased(
        uint256 indexed tokenId,
        address indexed owner,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );
    event LiquidityIncreased(
        uint256 indexed tokenId,
        address indexed owner,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );
    event SwapExactInput(
        address indexed tokenIn,
        uint256 amountIn,
        uint256 amountOut
    );
    event SwapExactOutput(
        address indexed tokenIn,
        uint256 amountIn,
        uint256 amountOut
    );

    constructor(address _positionManager, address _swapRouter) {
        positionManager = INonfungiblePositionManager(_positionManager);
        swapRouter = ISwapRouter(_swapRouter);
        // nonfungiblePositionManager = INonfungiblePositionManager(
        //     0xC36442b4a4522E871399CD717aBDD847Ab11FE88
        // );
        // swapRouter = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);
    }

    function sortTokens(
        address token0,
        address token1
    ) internal pure returns (address tokenA, address tokenB) {
        return token0 < token1 ? (token0, token1) : (token1, token0);
    }

    function createPool(
        address token0,
        address token1,
        uint160 sqrtPriceX96
    ) external returns (address) {
        (address tokenA, address tokenB) = sortTokens(token0, token1);

        pool = positionManager.createAndInitializePoolIfNecessary(
            tokenA,
            tokenB,
            FEE,
            sqrtPriceX96
        );
        emit PoolCreated(pool, tokenA, tokenB, FEE);

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
        //custom errors
        (address tokenA, address tokenB) = sortTokens(token0, token1);

        TransferHelper.safeTransferFrom(
            tokenA,
            msg.sender,
            address(this),
            amount0ToMint
        );
        TransferHelper.safeTransferFrom(
            tokenB,
            msg.sender,
            address(this),
            amount1ToMint
        );

        TransferHelper.safeApprove(
            tokenA,
            address(positionManager),
            amount0ToMint
        );
        TransferHelper.safeApprove(
            tokenB,
            address(positionManager),
            amount1ToMint
        );

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
        if (amount0 < amount0ToMint) {
            TransferHelper.safeApprove(token0, address(positionManager), 0);
            TransferHelper.safeTransfer(
                token0,
                msg.sender,
                (amount0ToMint - amount0)
            );
        }

        if (amount1 < amount1ToMint) {
            TransferHelper.safeApprove(token1, address(positionManager), 0);
            TransferHelper.safeTransfer(
                token1,
                msg.sender,
                (amount1ToMint - amount1)
            );
        }
        emit PositionMinted(tokenId, msg.sender, liquidity, amount0, amount1);

        return (tokenId, liquidity, amount0, amount1);
    }

    function collectAllFees(
        uint256 tokenId
    ) external returns (uint256 amount0, uint256 amount1) {
        Position memory position = positions[tokenId];
        if (msg.sender != position.owner) revert NotOwner({tokenId: tokenId});
        (amount0, amount1) = positionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: msg.sender,
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );
        emit FeesCollected(tokenId, msg.sender, amount0, amount1);

        return (amount0, amount1);
    }

    function decreaseLiquidity(
        uint256 tokenId,
        uint128 liquidity
    ) external returns (uint256 amount0, uint256 amount1) {
        Position memory position = positions[tokenId];
        if (msg.sender != position.owner) revert NotOwner({tokenId: tokenId});
        (amount0, amount1) = positionManager.decreaseLiquidity(
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: tokenId,
                liquidity: liquidity,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp + 600 seconds
            })
        );
        uint128 newLiquidity = positions[tokenId].liquidity -= liquidity;

        emit LiquidityDecreased(
            tokenId,
            msg.sender,
            newLiquidity,
            amount0,
            amount1
        );

        return (amount0, amount1);
    }

    function increaseLiquidity(
        uint256 tokenId,
        uint256 amountAdd0,
        uint256 amountAdd1
    ) external returns (uint128 liquidity, uint256 amount0, uint256 amount1) {
        Position memory position = positions[tokenId];
        if (msg.sender != position.owner) revert NotOwner({tokenId: tokenId});
        TransferHelper.safeTransferFrom(
            position.token0,
            msg.sender,
            address(this),
            amountAdd0
        );
        TransferHelper.safeTransferFrom(
            position.token1,
            msg.sender,
            address(this),
            amountAdd1
        );

        TransferHelper.safeApprove(
            position.token0,
            address(positionManager),
            amountAdd0
        );

        TransferHelper.safeApprove(
            position.token1,
            address(positionManager),
            amountAdd1
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
        uint128 newLiquidity = positions[tokenId].liquidity += liquidity;

        emit LiquidityIncreased(
            tokenId,
            msg.sender,
            newLiquidity,
            amount0,
            amount1
        );

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
        TransferHelper.safeApprove(tokenIn, address(swapRouter), amountIn);
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path,
                recipient: msg.sender,
                deadline: block.timestamp + 600 seconds,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum
            })
        );

        emit SwapExactInput(tokenIn, amountIn, amountOut);

        return amountOut;
    }

    function swapExactOutput(
        address tokenIn,
        uint256 amountOut,
        uint256 amountInMaximum,
        bytes memory path
    ) external returns (uint256 amountIn) {
        TransferHelper.safeTransferFrom(
            tokenIn,
            msg.sender,
            address(this),
            amountInMaximum
        );
        TransferHelper.safeApprove(
            tokenIn,
            address(swapRouter),
            amountInMaximum
        );

        amountIn = swapRouter.exactOutput(
            ISwapRouter.ExactOutputParams({
                path: path,
                recipient: msg.sender,
                deadline: block.timestamp + 600 seconds,
                amountOut: amountOut,
                amountInMaximum: amountInMaximum
            })
        );
        if (amountIn < amountInMaximum) {
            TransferHelper.safeApprove(tokenIn, address(swapRouter), 0);
            TransferHelper.safeTransfer(
                tokenIn,
                msg.sender,
                (amountInMaximum - amountIn)
            );
        }
        emit SwapExactOutput(tokenIn, amountIn, amountOut);

        return amountIn;
    }
}
