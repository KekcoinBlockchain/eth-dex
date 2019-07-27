pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Token.sol";

// Deposit & Withdraw Funds
// Manage Orders - Make or Cancel
// Handle Trades - Charge Peers

// To Do List:
	// [✓] Set the fee account
	// [✓] Deposit Ether
	// [] Withdraw Ether
	// [✓] Deposit Tokens
	// [] Withdraw Tokens
	// [] Check Balances
	// [] Make Order
	// [] Cancel Order
	// [] Fill Order
	// [] Charge fees

contract Exchange {

	using SafeMath for uint;

	// state variables
	address public feeRecevier; 					// account address that receives exchange usage fees
	uint256 public feePercent; 						// sets fee percentage taken by exchange
	address constant etherAddress = address(0); 	// uses the 0 address as a placeholder token for native ether
	address payable public charity;					// charity address

	// events
	event Deposit(address token, address user, uint256 amount, uint256 balance);				// general erc20 deposit event structure
	event Withdraw(address token, address user, uint256 amount, uint256 balance);				// general erc20 withdraw event structure

	
	mapping(address => mapping(address => uint256)) public tokens;			// first 'address' key tracks token address, 2nd 'address' key tracks user account that deposited token

	// constructor instantiates decentralized exchange smart contract
	constructor(address _feeReceiver, uint256 _feePercent) public {
		feeRecevier = _feeReceiver;
		feePercent = _feePercent;
		charity = msg.sender;
	}

	// defines charity restrictions usable on functions
	modifier onlyCharity() {
    	require(msg.sender == charity);
   	 	_;
  	}

	function depositEther() payable public {
		tokens[etherAddress][msg.sender] = tokens[etherAddress][msg.sender].add(msg.value);		// updates balance to add ether to user's account
		emit Deposit(etherAddress, msg.sender, msg.value, tokens[etherAddress][msg.sender]);	// emits deposit event
	}

	function withdrawEther(uint _amount) payable public {
		require(tokens[etherAddress][msg.sender] >= _amount);									// ensures user can't withdraw more ether than they own
		tokens[etherAddress][msg.sender] = tokens[etherAddress][msg.sender].sub(_amount);		// subtracts ether balance available to withdraw for current user
		msg.sender.transfer(_amount);															// transfers ether to user
		emit Withdraw(etherAddress, msg.sender, _amount, tokens[etherAddress][msg.sender]);		// emits withdrawal event
	} 

	function depositToken(address _token, uint256 _amount) public {
		require (_token != etherAddress);											// ensure token deposited is not native ether		
		require (Token(_token).transferFrom(msg.sender, address(this), _amount));	// send tokens from the user's wallet to this exchange contract	
		tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);		// manages deposit and updates balance		
		emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);		// emits deposit event
	}

	function withdrawToken(address _token, uint256 _amount) public {
		require (_token != etherAddress);											// ensure erc20 token is being withdrawn and not native ether
		require(tokens[_token][msg.sender] >= _amount);								// ensure user doesn't withdraw more tokens than they own
		tokens[_token][msg.sender] = tokens[_token][msg.sender].sub(_amount);		// safely subtracts balance with zerppelin safemaths
		require(Token(_token).transfer(msg.sender, _amount));						// requires the transfer of tokens to the user
		emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);		// emits withdrawal event
	}

	function balanceOf(address _token, address _user) public view returns (uint256) {
		return tokens[_token][_user];
	}

	function() payable external {}													// directly sent ether will be donated to charity												

	// chosen charity can be donated to for a noble cause
	function donate () public onlyCharity returns(bool success) {
    	charity.transfer(address(this).balance);
    	return true;
	}

	// charities can be switched using this function
    function transferCharity(address payable newCharity) public onlyCharity {
	    require(newCharity != address(0));
	    charity = newCharity;
  	}
}



