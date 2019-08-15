import React, {Component} from 'react';
import './App.css';
// import Web3 from 'web3';
import Navbar from './Navbar';
import Content from './Content';
import {connect} from 'react-redux';
import {
        loadWeb3, 
        loadAccount, 
        loadToken, 
        loadExchange
       } from '../store/interactions';
import {contractsLoadedSelector} from '../store/selectors';

class App extends Component {
  componentWillMount() {
    this.loadBlockchainData(this.props.dispatch)
  }

  async loadBlockchainData(dispatch) {
    const web3 = loadWeb3(dispatch);
    await web3.eth.net.getNetworkType();
    const networkID = await web3.eth.net.getId();
    await loadAccount(web3, dispatch);
    // const jsonInterface = Token.abi;
    // const tokenNetworks = Token.networks;
    // const networkData = tokenNetworks[networkID];
    // const tokenAddress = networkData.address;
    const token = loadToken(web3, networkID, dispatch);
    if(!token) {
      window.alert('Token smart contract not detected on the current network. Please select another network on Metamask');
      return;
    }
    const exchange = await loadExchange(web3, networkID, dispatch);
    if(!exchange) {
      window.alert('Exchange smart contract not detected on the current network. Please select another network on Metamask');
      return;
    }
    // const tokenName = await token.methods.name().call();
    // const tokenSymbol = await token.methods.symbol().call();
    // const totalSupply = await token.methods.totalSupply().call();
    // console.log("web3: ", web3);
    // console.log("network: ", network);
    // console.log("network id: ", networkID);
    // console.log("accounts: ", accounts);
    // console.log("abi: ", jsonInterface);
    // console.log("token networks: ", tokenNetworks);
    // console.log("network data: ", networkData);
    // console.log("token address: ", tokenAddress);
    // console.log("token: ", token);
    // console.log("token name:", tokenName);
    // console.log("token symbol:", tokenSymbol);
    // console.log("total supply: ", totalSupply);  
  }

  render() {
    return (
      <div>
        <Navbar/>
        {this.props.contractsLoaded ? <Content/> : <div className="content"></div>}
      </div>
    );
  };
};

function mapStateToProps(state) {
  return {
    contractsLoaded: contractsLoadedSelector(state)
  };
};

export default connect(mapStateToProps)(App);