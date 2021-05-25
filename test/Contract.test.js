const { assert, web3 } = require("hardhat");
const Contract = artifacts.require("Contract");

contract("Contract", ([owner, ...accounts]) => {
    let contract;

    beforeEach(async () => {
        contract = await Contract.new();
    });

    it("deploys a contract", () => {
        assert.ok(contract.address);
    });
})