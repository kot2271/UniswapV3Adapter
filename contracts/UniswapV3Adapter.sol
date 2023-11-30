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

    // Address of the pool
    address public pool;

    /**
     * @notice Struct that stores position data.
     * @param owner address of the position owner
     * @param token0 first token address
     * @param token1 second token address
     * @param amount0 token0 amount
     * @param amount1 token1 amount
     * @param liquidity liquidity value
     */
    struct Position {
        address owner;
        address token0;
        address token1;
        uint256 amount0;
        uint256 amount1;
        uint128 liquidity;
    }

    /**
     * @notice Mapping that stores positions by their token ID.
     */
    mapping(uint256 => Position) public positions;

    /**
     * Error generated when the caller is not the owner of the position.
     * @param tokenId Id token for liquidity pair
     */
    error NotOwner(uint256 tokenId);

    /**
     * Event generated upon pool creation.
     * @param pool pool address
     * @param token0 first token address
     * @param token1 second token address
     * @param fee the value of the commission. 
     */
    event PoolCreated(
        address indexed pool,
        address token0,
        address token1,
        uint24 fee
    );

    /**
     * Event generated upon creating a new position.
     * @param tokenId Id token for liquidity pair
     * @param owner address of the owner
     * @param liquidity liquidity value
     * @param amount0 token0 that was paid to add this amount of liquidity
     * @param amount1 the amount of token1 that was paid to add this amount of liquidity.
     */
    event PositionMinted(
        uint256 indexed tokenId,
        address indexed owner,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );

    /**
     * Event generated upon collecting fees from a position.
     * @param tokenId Id token for liquidity pair
     * @param owner address of the owner
     * @param amount0 Commission with the first token.
     * @param amount1 Commission with the second token.
     */
    event FeesCollected(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 amount0,
        uint256 amount1
    );

    /**
     * Event generated upon decreasing the liquidity of a position.
     * @param tokenId Id token for liquidity pair
     * @param owner address of the owner
     * @param liquidity new liquidity value
     * @param amount0 token0 that was paid to add this amount of liquidity
     * @param amount1 the amount of token1 that was paid to add this amount of liquidity.
     */
    event LiquidityDecreased(
        uint256 indexed tokenId,
        address indexed owner,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );

    /**
     * Event generated upon increasing the liquidity of a position.
     * @param tokenId Id token for liquidity pair
     * @param owner address of the owner
     * @param liquidity new liquidity value
     * @param amount0 token0 that was paid to add this amount of liquidity
     * @param amount1 the amount of token1 that was paid to add this amount of liquidity.
     */
    event LiquidityIncreased(
        uint256 indexed tokenId,
        address indexed owner,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );

    /**
     * Event generated upon exchanging an exact amount of input token.
     * @param tokenIn address of the input token
     * @param amountIn amount of input token
     * @param amountOut amount of output token
     */
    event SwapExactInput(
        address indexed tokenIn,
        uint256 amountIn,
        uint256 amountOut
    );

    /**
     * Event generated upon exchanging for an exact amount of output token.
     * @param tokenIn address of the input token
     * @param amountIn amount of input token
     * @param amountOut amount of output token
     */
    event SwapExactOutput(
        address indexed tokenIn,
        uint256 amountIn,
        uint256 amountOut
    );

    /**
     * This is the contract constructor 
     * that initializes positionManager 
     * and swapRouter with the provided addresses
     * @param _positionManager INonfungiblePositionManager
     * @param _swapRouter ISwapRouter
     */
    constructor(address _positionManager, address _swapRouter) {
        positionManager = INonfungiblePositionManager(_positionManager);
        swapRouter = ISwapRouter(_swapRouter);
    }

    /**
     * This function takes two tokens 
     * and returns them in sorted order.
     * @param token0 non-sorted token
     * @param token1 non-sorted token
     * @return tokenA first token
     * @return tokenB second token
     */
    function sortTokens(
        address token0,
        address token1
    ) internal pure returns (address tokenA, address tokenB) {
        return token0 < token1 ? (token0, token1) : (token1, token0);
    }

    /**
     * This function creates a pool for two tokens 
     * and initializes it with the provided square root price.
     * @param token0 first token
     * @param token1 second token
     * @param sqrtPriceX96 Price limit Q64.96 is calculated from 'getSqrtPriceX96'
     */
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

    /**
     * This function allows creating a new position in the pool, 
     * passing two tokens, pool fee, 
     * and the amount of each token for mining.
     * @param token0 first token address
     * @param token1 second token address
     * @param poolFee pool fee
     * @param amount0ToMint Minimum amount of mining first tokens required.
     * @param amount1ToMint Minimum amount of mining second tokens required.
     * @return tokenId Id token for liquidity pair.
     * @return liquidity Liquidity value
     * @return amount0 token0 that was paid to add this amount of liquidity
     * @return amount1 the amount of token1 that was paid to add this amount of liquidity.
     */
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

    /**
     * This function allows collecting all fees 
     * from the position specified by the token ID
     * @param tokenId Id token for liquidity pair
     * @return amount0 Commission with the first token.
     * @return amount1 Commission with the second token.
     */
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

    /**
     * This function allows decreasing the liquidity
     *  of the position specified by the token ID.
     * @param tokenId Id token for liquidity pair
     * @param liquidity new liquidity value
     * @return amount0 token0 that was paid to add this amount of liquidity
     * @return amount1 the amount of token1 that was paid to add this amount of liquidity.
     */
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

    /**
     * This function allows increasing the liquidity 
     * of the position specified by the token ID.
     * @param tokenId Id token for liquidity pair
     * @param amountAdd0 The value by which the position of the first token is increased.
     * @param amountAdd1 The value by which the position of the second token is increased.
     * @return liquidity new liquidity value
     * @return amount0 token0 that was paid to add this amount of liquidity
     * @return amount1 the amount of token1 that was paid to add this amount of liquidity.
     */
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

    /**
     * This function allows exchanging an exact amount of input token 
     * for a minimum amount of output token.
     * @param tokenIn input token
     * @param amountIn the amount of the inbound asset
     * @param amountOutMinimum the minimum amount of the outbound asset, less than which will cause the transaction to revert.
     * @param path The path is a sequence of (tokenAddress - fee - tokenAddress)
     */
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

    /**
     * This function allows exchanging a maximum amount of input token 
     * for an exact amount of output token.
     * @param tokenIn input token
     * @param amountOut exact amount of output token
     * @param amountInMaximum maximum amount of input token
     * @param path The path is a sequence of (tokenAddress - fee - tokenAddress)
     */
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
