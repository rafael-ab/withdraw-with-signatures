const { assert, ethers } = require("hardhat");
const { expectRevert } = require("@openzeppelin/test-helpers");

// Helpers
const toWei = (value, type) => ethers.utils.parseUnits(String(value), type);
const fromWei = (value, type) =>
  Number(ethers.utils.formatUnits(String(value), type));
const toBN = (value) => ethers.BigNumber.from(String(value));
const toDecimals = (value, decimals) =>
  (Number(value) / 10 ** decimals).toFixed(decimals);

const signWithdraw = async (signer, amount, nonce) => {
  const message = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256", "uint256"],
      [signer.address, amount, nonce]
    )
  );

  const signature = await signer.signMessage(ethers.utils.arrayify(message));

  return ethers.utils.splitSignature(signature);
};

contract("Withdraw", () => {
  let contract, owner, acc1;

  before(async () => {
    [owner, acc1] = await ethers.getSigners();
    const Withdraw = await ethers.getContractFactory("Withdraw", owner);
    contract = await Withdraw.deploy({ value: toWei(5000) });
  });

  it("contract should have balance", async () => {
    const balance = await contract.balance();
    assert(balance > 0);
  });

  it("owner adds a new spender", async () => {
    const tx = await contract.addSpender(acc1.address, toWei(10));
    const receipt = await tx.wait();
    console.log("\tGas Used :>> ", Number(receipt.gasUsed));
  });

  it("acc1 should withdraw with signing", async () => {
    const balanceBefore = await ethers.provider.getBalance(acc1.address);
    console.log(
      "\tACC1 Ether Balance \t\t(Before) :>> ",
      toDecimals(balanceBefore, 18)
    );

    const nonce = await contract.nonce();

    assert.equal(0, nonce);

    const sig = await signWithdraw(acc1, toWei(10), nonce);
    const tx = await contract
      .connect(acc1)
      .withdraw(toWei(10), nonce, sig.v, sig.r, sig.s);
    const receipt = await tx.wait();

    const balanceAfter = await ethers.provider.getBalance(acc1.address);
    console.log(
      "\tACC1 Ether Balance \t\t(After) :>> ",
      toDecimals(balanceAfter, 18)
    );
    console.log("\tGas Used :>> ", Number(receipt.gasUsed));
  });

  it("acc1 has insufficient allowance", async () => {
    const nonce = await contract.nonce();
    assert.equal(1, nonce);

    const sig = await signWithdraw(acc1, toWei(20), nonce);
    await expectRevert.unspecified(
      contract.connect(acc1).withdraw(toWei(20), nonce, sig.v, sig.r, sig.s)
    );
  });

  it("owner should deposit", async () => {
    const balanceBefore = await contract.balance();

    const tx = await contract.connect(owner).deposit({ value: toWei(2000) });
    const receipt = await tx.wait();

    const balanceAfter = await contract.balance();

    assert.equal(toWei(2000), balanceAfter - balanceBefore);

    console.log("\tGas Used :>> ", Number(receipt.gasUsed));
  });
});
