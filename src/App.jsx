import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { motion } from "framer-motion";
import { FiSend, FiLogOut, FiUser } from "react-icons/fi";
import contractABI from "./FundMe.json";

const contractAddress = "0xfA947d8aF4Ee207e6958143186fAf1fE8913777F";

export default function App() {
  const [amount, setAmount] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [balance, setBalance] = useState("0");
  const [funders, setFunders] = useState([]);

  const acc = currentAccount.slice(0, 3) + "xxxxxxxxxx" + currentAccount.slice(-6);

  async function connectWallet() {
    try {
      if (!window.ethereum) return alert("Install MetaMask");

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const account = accounts[0];
      setCurrentAccount(account);

      const newProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(newProvider);

      const signer = await newProvider.getSigner();
      const contractInstance = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );
      setContract(contractInstance);

      await checkOwner(account, contractInstance);
      await fetchBalance(newProvider, contractInstance);
      await fetchFunders(contractInstance);
    } catch (err) {
      console.error("Wallet connection error:", err);
    }
  }

  async function checkOwner(account, contractInstance) {
    if (!account || !contractInstance) return;
    const owner = await contractInstance.i_owner();
    setIsOwner(owner.toLowerCase() === account.toLowerCase());
  }

  async function fund() {
    try {
      if (!amount || !contract) return;
      const ethAmount = ethers.parseEther(amount);
      const tx = await contract.fund({ value: ethAmount });
      await tx.wait();
      if (provider && contract) {
        await fetchBalance(provider, contract);
        await fetchFunders(contract);
      }
      setAmount("");
    } catch (err) {
      console.error("Funding error:", err);
    }
  }

  async function withdraw() {
    try {
      if (!contract) return;
      const tx = await contract.withdraw();
      await tx.wait();
      if (provider && contract) {
        await fetchBalance(provider, contract);
        await fetchFunders(contract);
      }
    } catch (err) {
      console.error("Withdraw error:", err);
    }
  }

  async function fetchBalance(p, c) {
    if (!p || !c) return;
    const balance = await p.getBalance(c.target ?? c.address);
    setBalance(ethers.formatEther(balance));
  }

  async function fetchFunders(c) {
    if (!c) return;
    try {
      const fundersList = [];

      // Try fetching up to 100 funders (you can set a limit or use a counter function in contract)
      for (let i = 0; i < 100; i++) {
        try {
          const funder = await c.funders(i); // funders is a public array getter
          fundersList.push(funder);
        } catch (err) {
          break; // Stop loop when out-of-bounds
        }
      }

      setFunders(fundersList);
    } catch (err) {
      console.error("Error fetching funders:", err);
    }
  }

  useEffect(() => {
    if (window.ethereum) {
      connectWallet();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white font-sans">
      <div className="flex justify-between items-center p-6 shadow-md">
        <h1 className="text-2xl font-bold">FundMe 🚀</h1>
        <button
          onClick={connectWallet}
          className="bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          {currentAccount ? acc : "Connect Wallet"}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto mt-10 bg-white/5 p-8 rounded-2xl shadow-xl border border-white/10"
      >
        <h2 className="text-xl font-semibold mb-4">Support the Project 💰</h2>

        <input
          type="number"
          step="0.001"
          placeholder="Enter ETH amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-3 bg-white/10 rounded-lg text-white outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-300"
        />

        <motion.button
          whileTap={{ scale: 0.95 }}
          className="w-full mt-5 bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition"
          onClick={fund}
        >
          <FiSend /> Fund
        </motion.button>

        {isOwner && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition"
            onClick={withdraw}
          >
            <FiLogOut /> Withdraw
          </motion.button>
        )}

        <div className="mt-6 text-sm text-gray-300">
          Contract Balance: {balance} ETH
        </div>

        <div className="mt-4 text-sm">
          <h3 className="text-gray-200 font-semibold mb-2">Recent Funders:</h3>
          <ul className="space-y-1 max-h-24 overflow-auto">
            {funders.map((funder, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 text-xs text-gray-300"
              >
                <FiUser /> {funder}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
