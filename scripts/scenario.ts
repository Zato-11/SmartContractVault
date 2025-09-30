import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("🎬 SCÉNARIO : Coffre-fort décentralisé avec système de lock");
  console.log("=".repeat(70) + "\n");

  // ========================================
  // 1. DÉPLOIEMENT DU CONTRAT
  // ========================================
  console.log("📦 ÉTAPE 1 : Déploiement du contrat Vault");
  console.log("-".repeat(70));
  
  const LOCK_DURATION = 50; // 50 blocs de lock
  console.log(`⏱️  Durée de lock configurée : ${LOCK_DURATION} blocs\n`);

  const VaultFactory = await ethers.getContractFactory("Vault");
  const vault = await VaultFactory.deploy(LOCK_DURATION);
  await vault.waitForDeployment();
  
  const vaultAddress = await vault.getAddress();
  console.log(`✅ Vault déployé à : ${vaultAddress}\n`);

  // ========================================
  // 2. RÉCUPÉRATION DES ACTEURS
  // ========================================
  console.log("👥 ÉTAPE 2 : Récupération des acteurs");
  console.log("-".repeat(70));
  
  const [deployer, alice, pierre] = await ethers.getSigners();
  
  console.log(`👤 Alice  : ${alice.address}`);
  console.log(`💰 Solde  : ${ethers.formatEther(await ethers.provider.getBalance(alice.address))} ETH`);
  console.log();
  console.log(`👤 Pierre : ${pierre.address}`);
  console.log(`💰 Solde  : ${ethers.formatEther(await ethers.provider.getBalance(pierre.address))} ETH\n`);

  // ========================================
  // 3. ALICE DÉPOSE 2 ETH
  // ========================================
  console.log("💎 ÉTAPE 3 : Alice dépose 2 ETH");
  console.log("-".repeat(70));
  
  const aliceDeposit = ethers.parseEther("2.0");
  console.log(`📥 Montant du dépôt : ${ethers.formatEther(aliceDeposit)} ETH`);
  
  const aliceDepositTx = await vault.connect(alice).deposit({ value: aliceDeposit });
  const aliceDepositReceipt = await aliceDepositTx.wait();
  
  const aliceDepositBlock = aliceDepositReceipt!.blockNumber;
  const aliceUnlockBlock = await vault.unlockBlock(alice.address);
  
  console.log(`✅ Dépôt effectué au bloc : ${aliceDepositBlock}`);
  console.log(`🔓 Déblocage prévu au bloc : ${aliceUnlockBlock}`);
  console.log(`⏳ Blocs à attendre : ${Number(aliceUnlockBlock) - aliceDepositBlock}\n`);

  // ========================================
  // 4. PIERRE DÉPOSE 1.5 ETH
  // ========================================
  console.log("💎 ÉTAPE 4 : Pierre dépose 1.5 ETH");
  console.log("-".repeat(70));
  
  const pierreDeposit = ethers.parseEther("1.5");
  console.log(`📥 Montant du dépôt : ${ethers.formatEther(pierreDeposit)} ETH`);
  
  const pierreDepositTx = await vault.connect(pierre).deposit({ value: pierreDeposit });
  const pierreDepositReceipt = await pierreDepositTx.wait();
  
  const pierreDepositBlock = pierreDepositReceipt!.blockNumber;
  const pierreUnlockBlock = await vault.unlockBlock(pierre.address);
  
  console.log(`✅ Dépôt effectué au bloc : ${pierreDepositBlock}`);
  console.log(`🔓 Déblocage prévu au bloc : ${pierreUnlockBlock}`);
  console.log(`⏳ Blocs à attendre : ${Number(pierreUnlockBlock) - pierreDepositBlock}\n`);

  // ========================================
  // 5. AFFICHAGE DE L'ÉTAT DU VAULT
  // ========================================
  console.log("📊 ÉTAPE 5 : État actuel du Vault");
  console.log("-".repeat(70));
  
  const currentBlock1 = await ethers.provider.getBlockNumber();
  console.log(`🧱 Bloc actuel : ${currentBlock1}`);
  console.log();
  console.log(`Alice  :`);
  console.log(`  💰 Solde dans le vault : ${ethers.formatEther(await vault.balances(alice.address))} ETH`);
  console.log(`  🔒 Débloqué ? ${await vault.isUnlocked(alice.address) ? "✅ OUI" : "❌ NON"}`);
  console.log();
  console.log(`Pierre :`);
  console.log(`  💰 Solde dans le vault : ${ethers.formatEther(await vault.balances(pierre.address))} ETH`);
  console.log(`  🔒 Débloqué ? ${await vault.isUnlocked(pierre.address) ? "✅ OUI" : "❌ NON"}`);
  console.log();

  // ========================================
  // 6. MINER DES BLOCS (SEULEMENT 30)
  // ========================================
  console.log("⛏️  ÉTAPE 6 : On mine 30 blocs (lockDuration = 50)");
  console.log("-".repeat(70));
  console.log("⏳ Mining en cours...");
  
  for (let i = 0; i < 30; i++) {
    await ethers.provider.send("evm_mine", []);
  }
  
  const currentBlock2 = await ethers.provider.getBlockNumber();
  console.log(`✅ ${30} blocs minés`);
  console.log(`🧱 Nouveau bloc actuel : ${currentBlock2}\n`);

  // ========================================
  // 7. ALICE TENTE DE RETIRER (TROP TÔT)
  // ========================================
  console.log("💸 ÉTAPE 7 : Alice essaie de retirer 1 ETH (TROP TÔT)");
  console.log("-".repeat(70));
  
  const aliceWithdrawAmount = ethers.parseEther("1.0");
  console.log(`📤 Montant demandé : ${ethers.formatEther(aliceWithdrawAmount)} ETH`);
  
  const aliceBlocksRemaining = Number(await vault.unlockBlock(alice.address)) - currentBlock2;
  console.log(`⏳ Blocs restants avant déblocage : ${aliceBlocksRemaining}`);
  console.log(`🔒 Statut : ${await vault.isUnlocked(alice.address) ? "✅ Débloqué" : "❌ Verrouillé"}`);
  
  try {
    await vault.connect(alice).withdraw(aliceWithdrawAmount);
    console.log("✅ Retrait réussi\n");
  } catch (error: any) {
    console.log("❌ Retrait REFUSÉ !");
    console.log(`💬 Raison : ${error.message.includes("Fonds verrouilles") ? "Fonds encore verrouillés" : "Erreur inconnue"}\n`);
  }

  // ========================================
  // 8. PIERRE TENTE DE RETIRER (TROP TÔT)
  // ========================================
  console.log("💸 ÉTAPE 8 : Pierre essaie de retirer 0.5 ETH (TROP TÔT)");
  console.log("-".repeat(70));
  
  const pierreWithdrawAmount = ethers.parseEther("0.5");
  console.log(`📤 Montant demandé : ${ethers.formatEther(pierreWithdrawAmount)} ETH`);
  
  const pierreBlocksRemaining = Number(await vault.unlockBlock(pierre.address)) - currentBlock2;
  console.log(`⏳ Blocs restants avant déblocage : ${pierreBlocksRemaining}`);
  console.log(`🔒 Statut : ${await vault.isUnlocked(pierre.address) ? "✅ Débloqué" : "❌ Verrouillé"}`);
  
  try {
    await vault.connect(pierre).withdraw(pierreWithdrawAmount);
    console.log("✅ Retrait réussi\n");
  } catch (error: any) {
    console.log("❌ Retrait REFUSÉ !");
    console.log(`💬 Raison : ${error.message.includes("Fonds verrouilles") ? "Fonds encore verrouillés" : "Erreur inconnue"}\n`);
  }

  // ========================================
  // 9. MINER ENCORE 25 BLOCS (TOTAL: 55)
  // ========================================
  console.log("⛏️  ÉTAPE 9 : On mine 25 blocs supplémentaires");
  console.log("-".repeat(70));
  console.log("⏳ Mining en cours...");
  
  for (let i = 0; i < 25; i++) {
    await ethers.provider.send("evm_mine", []);
  }
  
  const currentBlock3 = await ethers.provider.getBlockNumber();
  console.log(`✅ ${25} blocs minés`);
  console.log(`🧱 Nouveau bloc actuel : ${currentBlock3}`);
  console.log(`📊 Total de blocs minés depuis les dépôts : ~55\n`);

  // ========================================
  // 10. ALICE RETIRE AVEC SUCCÈS
  // ========================================
  console.log("💸 ÉTAPE 10 : Alice essaie de retirer 1 ETH (SUCCÈS ATTENDU)");
  console.log("-".repeat(70));
  
  console.log(`📤 Montant demandé : ${ethers.formatEther(aliceWithdrawAmount)} ETH`);
  console.log(`🔒 Statut : ${await vault.isUnlocked(alice.address) ? "✅ Débloqué" : "❌ Verrouillé"}`);
  
  const aliceBalanceBefore = await ethers.provider.getBalance(alice.address);
  
  try {
    const aliceWithdrawTx = await vault.connect(alice).withdraw(aliceWithdrawAmount);
    await aliceWithdrawTx.wait();
    
    const aliceBalanceAfter = await ethers.provider.getBalance(alice.address);
    
    console.log("✅ Retrait RÉUSSI !");
    console.log(`💰 Nouveau solde dans le vault : ${ethers.formatEther(await vault.balances(alice.address))} ETH`);
    console.log(`💳 Solde ETH wallet Alice : ${ethers.formatEther(aliceBalanceAfter)} ETH\n`);
  } catch (error: any) {
    console.log("❌ Retrait échoué");
    console.log(`💬 Erreur : ${error.message}\n`);
  }

  // ========================================
  // 11. PIERRE RETIRE AVEC SUCCÈS
  // ========================================
  console.log("💸 ÉTAPE 11 : Pierre essaie de retirer 0.5 ETH (SUCCÈS ATTENDU)");
  console.log("-".repeat(70));
  
  console.log(`📤 Montant demandé : ${ethers.formatEther(pierreWithdrawAmount)} ETH`);
  console.log(`🔒 Statut : ${await vault.isUnlocked(pierre.address) ? "✅ Débloqué" : "❌ Verrouillé"}`);
  
  const pierreBalanceBefore = await ethers.provider.getBalance(pierre.address);
  
  try {
    const pierreWithdrawTx = await vault.connect(pierre).withdraw(pierreWithdrawAmount);
    await pierreWithdrawTx.wait();
    
    const pierreBalanceAfter = await ethers.provider.getBalance(pierre.address);
    
    console.log("✅ Retrait RÉUSSI !");
    console.log(`💰 Nouveau solde dans le vault : ${ethers.formatEther(await vault.balances(pierre.address))} ETH`);
    console.log(`💳 Solde ETH wallet Pierre : ${ethers.formatEther(pierreBalanceAfter)} ETH\n`);
  } catch (error: any) {
    console.log("❌ Retrait échoué");
    console.log(`💬 Erreur : ${error.message}\n`);
  }

  // ========================================
  // 12. RÉCAPITULATIF FINAL
  // ========================================
  console.log("=".repeat(70));
  console.log("📋 RÉCAPITULATIF FINAL");
  console.log("=".repeat(70));
  
  const finalBlock = await ethers.provider.getBlockNumber();
  
  console.log(`\n🧱 Bloc final : ${finalBlock}`);
  console.log(`📊 Statistiques du Vault :\n`);
  
  console.log(`Alice :`);
  console.log(`  📥 Dépôt initial    : ${ethers.formatEther(aliceDeposit)} ETH`);
  console.log(`  📤 Retiré           : ${ethers.formatEther(aliceWithdrawAmount)} ETH`);
  console.log(`  💰 Reste dans vault : ${ethers.formatEther(await vault.balances(alice.address))} ETH`);
  console.log(`  🔓 Bloc de dépôt    : ${aliceDepositBlock}`);
  console.log(`  🔓 Bloc de déblocage: ${aliceUnlockBlock}`);
  console.log();
  
  console.log(`Pierre :`);
  console.log(`  📥 Dépôt initial    : ${ethers.formatEther(pierreDeposit)} ETH`);
  console.log(`  📤 Retiré           : ${ethers.formatEther(pierreWithdrawAmount)} ETH`);
  console.log(`  💰 Reste dans vault : ${ethers.formatEther(await vault.balances(pierre.address))} ETH`);
  console.log(`  🔓 Bloc de dépôt    : ${pierreDepositBlock}`);
  console.log(`  🔓 Bloc de déblocage: ${pierreUnlockBlock}`);
  console.log();
  
  console.log("=".repeat(70));
  console.log("✅ Scénario terminé avec succès !");
  console.log("=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERREUR FATALE :");
    console.error(error);
    process.exit(1);
  });