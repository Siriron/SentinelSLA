// SentinelSLA — chain configuration
//
// StudioNet only, by explicit project convention (every SentinelSLA
// deployment and every future app in this project targets StudioNet;
// Bradbury is not wired up here — offering a network toggle with no real
// deployment behind it would be worse than not offering one at all).

export const STUDIONET_CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS_STUDIONET ||
  '0x9bf02585228D7A7E3d4dcB3a35928045a7C250E8';

export const STUDIONET_CONFIG = {
  chainId: '0xF22F', // 61999
  chainName: 'GenLayer StudioNet',
  rpcUrls: ['https://studio.genlayer.com/api'],
  nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
  blockExplorerUrls: ['https://explorer-studio.genlayer.com'],
};

export const EXPLORER_TX_URL = (hash: string) =>
  `${STUDIONET_CONFIG.blockExplorerUrls[0]}/tx/${hash}`;

export const EXPLORER_ADDRESS_URL = (address: string) =>
  `${STUDIONET_CONFIG.blockExplorerUrls[0]}/address/${address}`;

export const RECEIPT_CONFIG = {
  retries: 120,
  interval: 4000,
};
