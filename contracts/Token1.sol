// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol"; // 引入了 OpenZeppelin 的 ERC20 合约库，这是区块链开发中最常用的安全可靠的 ERC20 实现。

/* 
合约名称：Token1
代币名称：Gold1（通过 ERC20 构造函数定义）
代币符号：GLD1（通过 ERC20 构造函数定义） 
标准规范：遵循 ERC20 代币标准（基于 OpenZeppelin 的 ERC20.sol 实现）
*/
contract Token1 is ERC20 {
    /* 
    作用：合约部署时自动执行，用于初始化代币的基本信息和初始供应量。
    参数：initialSupply（初始供应量，单位为代币的最小单位，如 wei 之于 ETH）。
    关键操作：
    调用父合约 ERC20 的构造函数 ERC20("Gold1", "GLD1")，设置代币名称为 “Gold1”，符号为 “GLD1”。
    通过 _mint(msg.sender, initialSupply) 铸造初始代币：
    _mint 是 OpenZeppelin ERC20 合约中的内部函数，用于创建新代币并分配给指定地址。
    msg.sender 指合约部署者的地址，即初始代币会全部 mint 给部署者。 
    */

    constructor(uint256 initialSupply) ERC20("Gold1", "GLD1") {
        // msg.sender 指合约部署者的地址，即初始代币会全部 mint 给部署者。
        _mint(msg.sender, initialSupply); // initialSupply（初始供应量，单位为代币的最小单位，如 wei 之于 ETH）。
    }

    /* 
    作用：允许调用者向指定地址铸造新的 GLD1 代币（扩展了 ERC20 的基础功能）。
    参数：
    to：接收新铸造代币的地址。
    amount：铸造的代币数量（单位为最小单位）。

    实现细节：
    调用内部函数 _mint(to, amount) 执行铸造逻辑（_mint 由父合约 ERC20 提供，负责更新代币总量和接收地址的余额）。
    注意：此函 数的可见性为 public，意味着任何地址都可以调用它铸造代币（这是一个潜在的安全风险，实际开发中通常会添加权限控制，如仅 Owner 可调用）。
    */

    function mint(address to, uint256 amound) public {
        _mint(to, amound);
    }
}

/* 
五、继承的 ERC20 核心功能
由于继承了 OpenZeppelin 的 ERC20 合约，Token1 自动拥有以下标准功能（无需重复实现）：

余额查询：balanceOf(address account) —— 查询指定地址的代币余额。
转账：transfer(address to, uint256 amount) —— 向指定地址转账代币。
授权转账：approve(address spender, uint256 amount) —— 授权其他地址代自己转账代币。
授权转账执行：transferFrom(address from, address to, uint256 amount) —— 按授权额度从指定地址转账代币。
代币总量：totalSupply() —— 查询当前代币的总供应量。

六、合约特点与潜在问题
优点：
基于 OpenZeppelin 库开发，确保了 ERC20 标准的安全实现（避免了常见的漏洞如整数溢出）。
初始化逻辑清晰，部署时自动分配初始代币。
潜在问题：
mint 函数无权限控制：任何人都可调用铸造代币，可能导致代币通胀、价值稀释（实际应用中应添加 onlyOwner 等修饰符，限制仅合约所有者可铸造）。
未实现代币销毁（burn）功能：如果需要销毁代币，需额外实现 burn 函数（调用 _burn 内部函数）。
总结
这个 Token1 合约是一个简单的 ERC20 代币实现，核心功能包括：

部署时向部署者铸造初始供应量的 GLD1 代币。
允许公开调用 mint 函数向任意地址铸造新代币。
继承 ERC20 标准的所有转账、余额查询等功能。

适合用于测试环境或简单场景，若用于生产环境，需添加权限控制（如 Ownable 库）限制 mint 权限，避免安全风险。 

*/
