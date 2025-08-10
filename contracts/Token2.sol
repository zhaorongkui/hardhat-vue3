//  奖励合约
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/* 
引入 OpenZeppelin 的 ERC20 合约库，这是区块链行业公认的安全、标准的 ERC20 实现，
内置了转账、余额查询、授权等核心功能，避免了手动实现可能导致的漏洞（如整数溢出、逻辑错误）。
Token2 合约通过 is ERC20 继承了 ERC20 合约的所有功能，无需重复编写标准逻辑。
 */

contract Token2 is ERC20 {

/* 
作用：合约部署时自动执行，用于初始化代币的基本信息和初始供应量。
参数：initialSupply 为初始代币总量（单位为代币的最小单位，例如 1e18 代表 1 个代币）。
关键操作：
调用父合约 ERC20 的构造函数 ERC20("Gold2", "GLD2")，设置代币的名称为 Gold2、符号为 GLD2
通过 _mint(msg.sender, initialSupply) 向合约部署者铸造初始代币：
_mint 是 ERC20 合约的内部函数，用于创建新代币并分配到指定地址，这里 msg.sender 即部署者地址，初始代币全部归部署者所有。
 */
    
    constructor (uint256 initialSupply) ERC20 ("Gold2", "GLD2"){
        _mint(msg.sender, initialSupply);

    }
/* 
作用：允许调用者向指定地址铸造新的 Token2 代币，用于增发奖励代币（例如在质押系统中补充奖励池）。
参数：
to：接收新铸造代币的地址（如质押合约地址 StakingRewards，用于后续向用户发放奖励）。
amount：铸造的代币数量（单位为最小单位）。
实现逻辑：调用 ERC20 内部函数 _mint(to, amount) 执行铸造，_mint 会自动更新代币总供应量（totalSupply）和接收地址的余额（balanceOf[to]）。

核心功能：代币铸造（mint 函数）
*/
    function mint(address to, uint256 amound) public {
        _mint(to, amound);
    }
}

/* 
五、继承的 ERC20 标准功能
由于继承了 ERC20 合约，Token2 自动拥有以下核心功能（无需重复实现）：

余额查询：balanceOf(address account) —— 查询指定地址的 Token2 余额（例如查询质押合约中奖励代币的剩余量）。
代币转账：transfer(address to, uint256 amount) —— 向指定地址转账 Token2（例如用户领取奖励后转账到其他地址）。
授权转账：approve(address spender, uint256 amount) —— 授权其他地址（如质押合约）代自己转账 Token2。
授权执行转账：transferFrom(address from, address to, uint256 amount) —— 按授权额度从指定地址转账 Token2（例如质押合约向用户发放奖励时使用）。
总供应量查询：totalSupply() —— 查询 Token2 的当前总发行量。

六、在质押奖励系统中的作用
结合之前的 StakingRewards 质押合约，Token2 的核心作用是作为 奖励代币：

部署者通过 mint 函数铸造 Token2 并转入 StakingRewards 合约，作为奖励池资金。
用户质押 Token1 后，StakingRewards 合约按规则计算奖励，并通过 transfer 函数将 Token2 发放给用户（即 getReward 功能）。
用户领取 Token2 后，可通过 transfer 转账或在其他场景中使用。

七、潜在问题与优化建议
命名不一致：合约名为 Token2，但代币名称和符号为 Gold1/GLD1，易与 Token1 混淆，建议修正为 Gold2/GLD2 以明确区分。
无权限控制：mint 函数为 public 权限，任何地址都可调用铸造代币，可能导致奖励代币通胀、价值稀释。实际应用中应添加权限控制（如通过 OpenZeppelin 的 Ownable 库，限制仅所有者可调用 mint）。
缺少销毁功能：若需回收奖励代币（如调整奖励池），可添加 burn 函数（调用 ERC20 的 _burn 内部函数）。
总结
Token2 是一个简单的 ERC20 代币合约，核心功能是：

部署时向部署者铸造初始供应量的代币。
允许公开铸造新代币（可用于补充奖励池）。
继承 ERC20 标准的转账、余额查询等功能。

在质押奖励系统中，它作为奖励媒介，配合 StakingRewards 合约实现 “质押即挖矿” 的激励逻辑。若用于生产环境，需修正命名并添加权限控制以确保代币经济的稳定性。
 */