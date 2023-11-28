import { getNamedAccounts, deployments } from "hardhat";
import { verify } from "../helpers/verify";

const CONTRACT_NAME = "UniswapV3Adapter";
const POSITION_MANAGER_ADDRESS = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
const SWAP_ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

const TOKEN_CONTRACT_NAME = "TestToken";

const PIZZA_TOKEN_NAME = "PizzaToken";
const PIZZA_TOKEN_SYMBOL = "PiToken";

const SUSHI_TOKEN_NAME = "SushiToken";
const SUSHI_TOKEN_SYMBOL = "SuToken";

async function deployFunction() {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const args = [POSITION_MANAGER_ADDRESS, SWAP_ROUTER_ADDRESS];
  const uniswapV3Adapter = await deploy(CONTRACT_NAME, {
    from: deployer,
    log: true,
    args: args,
    waitConfirmations: 6,
  });
  console.log(`${CONTRACT_NAME} deployed at: ${uniswapV3Adapter.address}`);
  await verify(uniswapV3Adapter.address, args);

  const pizzaTokenArgs = [PIZZA_TOKEN_NAME, PIZZA_TOKEN_SYMBOL];
  const pizzaToken = await deploy(TOKEN_CONTRACT_NAME, {
    from: deployer,
    log: true,
    args: pizzaTokenArgs,
    waitConfirmations: 6,
  });
  console.log(`${PIZZA_TOKEN_NAME} deployed at: ${pizzaToken.address}`);
  await verify(pizzaToken.address, pizzaTokenArgs);

  const sushiTokenArgs = [SUSHI_TOKEN_NAME, SUSHI_TOKEN_SYMBOL];
  const sushiToken = await deploy(TOKEN_CONTRACT_NAME, {
    from: deployer,
    log: true,
    args: sushiTokenArgs,
    waitConfirmations: 6,
  });
  console.log(`${SUSHI_TOKEN_NAME} deployed at: ${sushiToken.address}`);
  await verify(sushiToken.address, sushiTokenArgs);
}

deployFunction()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
