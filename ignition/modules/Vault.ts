import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const VaultModule = buildModule("VaultModule", (m) => {
  // Durée du lock : 100 blocs pour les tests
  // Sur mainnet Ethereum : ~7200 blocs = 1 jour
  const lockDuration = m.getParameter("lockDuration", 100);

  const vault = m.contract("Vault", [lockDuration]);

  return { vault };
});

export default VaultModule;