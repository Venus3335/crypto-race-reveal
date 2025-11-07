import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedZLottery = await deploy("ZLottery", {
    from: deployer,
    log: true,
  });

  console.log(`ZLottery contract deployed at: `, deployedZLottery.address);
  console.log(`Contract deployed by: `, deployer);
};

export default func;
func.id = "deploy_zlottery";
func.tags = ["ZLottery"];