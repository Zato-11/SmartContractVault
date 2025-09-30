import { expect } from "chai";
import { ethers } from "hardhat";
import { Vault } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Vault", function () {
  let vault: Vault;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const LOCK_DURATION = 100;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const VaultFactory = await ethers.getContractFactory("Vault");
    vault = await VaultFactory.deploy(LOCK_DURATION);
    await vault.waitForDeployment();
  });

  describe("Déploiement", function () {
    it("Devrait définir la bonne durée de lock", async function () {
      expect(await vault.lockDuration()).to.equal(LOCK_DURATION);
    });
  });

  describe("Dépôts", function () {
    it("Devrait permettre un dépôt d'ETH", async function () {
      const depositAmount = ethers.parseEther("1.0");
      
      await expect(vault.connect(user1).deposit({ value: depositAmount }))
        .to.emit(vault, "Deposit")
        .withArgs(user1.address, depositAmount, depositAmount);

      expect(await vault.balances(user1.address)).to.equal(depositAmount);
    });

    it("Devrait rejeter un dépôt de 0 ETH", async function () {
      await expect(
        vault.connect(user1).deposit({ value: 0 })
      ).to.be.revertedWith("Montant doit etre > 0");
    });

    it("Devrait cumuler plusieurs dépôts", async function () {
      const deposit1 = ethers.parseEther("1.0");
      const deposit2 = ethers.parseEther("0.5");

      await vault.connect(user1).deposit({ value: deposit1 });
      await vault.connect(user1).deposit({ value: deposit2 });

      expect(await vault.balances(user1.address)).to.equal(deposit1 + deposit2);
    });

    it("Devrait garder les soldes séparés", async function () {
      const deposit1 = ethers.parseEther("1.0");
      const deposit2 = ethers.parseEther("2.0");

      await vault.connect(user1).deposit({ value: deposit1 });
      await vault.connect(user2).deposit({ value: deposit2 });

      expect(await vault.balances(user1.address)).to.equal(deposit1);
      expect(await vault.balances(user2.address)).to.equal(deposit2);
    });
  });

  describe("Retraits", function () {
    const depositAmount = ethers.parseEther("2.0");

    beforeEach(async function () {
      await vault.connect(user1).deposit({ value: depositAmount });
    });

    it("Devrait rejeter un retrait si les fonds sont lockés", async function () {
      const withdrawAmount = ethers.parseEther("1.0");
      
      await expect(
        vault.connect(user1).withdraw(withdrawAmount)
      ).to.be.revertedWith("Fonds verrouilles");
    });

    it("Devrait permettre un retrait après le lock", async function () {
      const withdrawAmount = ethers.parseEther("1.0");
      
      // Miner des blocs pour dépasser le lock
      for (let i = 0; i < LOCK_DURATION + 1; i++) {
        await ethers.provider.send("evm_mine", []);
      }

      await expect(vault.connect(user1).withdraw(withdrawAmount))
        .to.emit(vault, "Withdraw")
        .withArgs(user1.address, withdrawAmount, depositAmount - withdrawAmount);

      expect(await vault.balances(user1.address)).to.equal(depositAmount - withdrawAmount);
    });

    it("Devrait rejeter un retrait de 0 ETH", async function () {
      for (let i = 0; i < LOCK_DURATION + 1; i++) {
        await ethers.provider.send("evm_mine", []);
      }

      await expect(
        vault.connect(user1).withdraw(0)
      ).to.be.revertedWith("Montant doit etre > 0");
    });

    it("Devrait rejeter un retrait supérieur au solde", async function () {
      const withdrawAmount = ethers.parseEther("3.0");
      
      for (let i = 0; i < LOCK_DURATION + 1; i++) {
        await ethers.provider.send("evm_mine", []);
      }

      await expect(
        vault.connect(user1).withdraw(withdrawAmount)
      ).to.be.revertedWith("Solde insuffisant");
    });
  });

  describe("withdrawAll", function () {
    const depositAmount = ethers.parseEther("2.0");

    beforeEach(async function () {
      await vault.connect(user1).deposit({ value: depositAmount });
    });

    it("Devrait retirer tous les fonds après le lock", async function () {
      for (let i = 0; i < LOCK_DURATION + 1; i++) {
        await ethers.provider.send("evm_mine", []);
      }

      await vault.connect(user1).withdrawAll();

      expect(await vault.balances(user1.address)).to.equal(0);
    });

    it("Devrait rejeter withdrawAll si pas de fonds", async function () {
      await expect(
        vault.connect(user2).withdrawAll()
      ).to.be.revertedWith("Aucun fonds");
    });
  });

  describe("Fonctions de vue", function () {
    it("Devrait retourner le bon solde utilisateur", async function () {
      const depositAmount = ethers.parseEther("1.5");
      await vault.connect(user1).deposit({ value: depositAmount });

      expect(await vault.getBalance(user1.address)).to.equal(depositAmount);
    });

    it("Devrait indiquer si les fonds sont débloqués", async function () {
      const depositAmount = ethers.parseEther("1.0");
      await vault.connect(user1).deposit({ value: depositAmount });

      expect(await vault.isUnlocked(user1.address)).to.be.false;

      for (let i = 0; i < LOCK_DURATION + 1; i++) {
        await ethers.provider.send("evm_mine", []);
      }

      expect(await vault.isUnlocked(user1.address)).to.be.true;
    });
  });

  describe("Vault sans lock", function () {
    let vaultNoLock: Vault;

    beforeEach(async function () {
      const VaultFactory = await ethers.getContractFactory("Vault");
      vaultNoLock = await VaultFactory.deploy(0);
      await vaultNoLock.waitForDeployment();
    });

    it("Devrait permettre un retrait immédiat", async function () {
      const depositAmount = ethers.parseEther("1.0");
      await vaultNoLock.connect(user1).deposit({ value: depositAmount });

      await expect(
        vaultNoLock.connect(user1).withdraw(depositAmount)
      ).to.not.be.reverted;
    });

    it("Devrait toujours indiquer isUnlocked = true", async function () {
      expect(await vaultNoLock.isUnlocked(user1.address)).to.be.true;
    });
  });
});