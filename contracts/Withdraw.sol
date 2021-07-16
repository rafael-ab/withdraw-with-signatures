// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "hardhat/console.sol";

contract Withdraw is Ownable {
    using SafeMath for uint256;
    using ECDSA for bytes32;

    uint256 public balance;
    uint256 public nonce;

    mapping(address => uint256) public allowance;

    event Deposit(uint256 indexed amount);
    event Withdraw(
        address indexed spender,
        uint256 indexed amount,
        uint256 indexed nonce
    );
    event SpenderAdded(address indexed spender, uint256 amount);

    constructor() payable {
        require(msg.value > 0, "Withdrawal::constructor: ZERO_AMOUNT");
        balance = balance.add(msg.value);
        emit Deposit(msg.value);
    }

    function addSpender(address _spender, uint256 _amount) external onlyOwner {
        allowance[_spender] = _amount;
        emit SpenderAdded(_spender, _amount);
    }

    function deposit() external payable onlyOwner {
        require(msg.value > 0, "Withdrawal::deposit: ZERO_AMOUNT");
        balance = balance.add(msg.value);
        emit Deposit(msg.value);
    }

    function withdraw(
        uint256 _amount,
        uint256 _nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(
            address(msg.sender) != address(0),
            "Withdrawal::withdraw: ZERO_ADDRESS"
        );
        require(_amount > 0, "Withdrawal::withdraw: ZERO_AMOUNT");
        require(balance > 0, "Withdrawal::withdraw: ZERO_BALANCE");
        require(
            _amount <= allowance[msg.sender],
            "Withdrawal::withdraw: INSUFFICIENT_ALLOWANCE"
        );
        require(
            balance >= _amount,
            "Withdrawal::withdraw: INSUFFICIENT_BALANCE"
        );

        bytes32 messageHash = _getMessageHash(msg.sender, _amount, _nonce);
        address signer = messageHash.recover(v, r, s);
        require(signer == msg.sender, "Withdrawal::withdraw: INVALID_SIGNER");

        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Withdrawal::withdraw: TRANSFER_FAILED");

        balance = balance.sub(_amount);
        nonce = nonce.add(1);

        emit Withdraw(msg.sender, _amount, _nonce);
    }

    function _getMessageHash(
        address _spender,
        uint256 _amount,
        uint256 _nonce
    ) internal pure returns (bytes32 messageHash) {
        bytes32 hash = keccak256(abi.encode(_spender, _amount, _nonce));
        messageHash = hash.toEthSignedMessageHash();
    }
}
