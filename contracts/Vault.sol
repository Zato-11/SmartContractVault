// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Vault
 * @dev Coffre-fort décentralisé avec système de lock
 */
contract Vault {
    // Solde de chaque utilisateur
    mapping(address => uint256) public balances;
    
    // Bloc de déblocage pour chaque utilisateur
    mapping(address => uint256) public unlockBlock;
    
    // Durée du lock en blocs
    uint256 public lockDuration;
    
    // Events
    event Deposit(address indexed user, uint256 amount, uint256 newBalance);
    event Withdraw(address indexed user, uint256 amount, uint256 newBalance);
    
    constructor(uint256 _lockDuration) {
        lockDuration = _lockDuration;
    }
    
    /**
     * @dev Déposer de l'ETH dans le vault
     */
    function deposit() external payable {
        require(msg.value > 0, "Montant doit etre > 0");
        
        balances[msg.sender] += msg.value;
        
        // Définir le bloc de déblocage
        if (lockDuration > 0) {
            unlockBlock[msg.sender] = block.number + lockDuration;
        }
        
        emit Deposit(msg.sender, msg.value, balances[msg.sender]);
    }
    
    /**
     * @dev Retirer un montant spécifique
     */
    function withdraw(uint256 _amount) external {
        require(_amount > 0, "Montant doit etre > 0");
        require(balances[msg.sender] >= _amount, "Solde insuffisant");
        
        // Vérifier le lock
        if (lockDuration > 0) {
            require(block.number >= unlockBlock[msg.sender], "Fonds verrouilles");
        }
        
        balances[msg.sender] -= _amount;
        
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfert echoue");
        
        emit Withdraw(msg.sender, _amount, balances[msg.sender]);
    }
    
    /**
     * @dev Retirer tous ses fonds
     */
    function withdrawAll() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "Aucun fonds");
        
        if (lockDuration > 0) {
            require(block.number >= unlockBlock[msg.sender], "Fonds verrouilles");
        }
        
        balances[msg.sender] = 0;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfert echoue");
        
        emit Withdraw(msg.sender, amount, 0);
    }
    
    /**
     * @dev Obtenir le solde d'un utilisateur
     */
    function getBalance(address _user) external view returns (uint256) {
        return balances[_user];
    }
    
    /**
     * @dev Vérifier si les fonds sont débloqués
     */
    function isUnlocked(address _user) external view returns (bool) {
        if (lockDuration == 0) return true;
        return block.number >= unlockBlock[_user];
    }
}