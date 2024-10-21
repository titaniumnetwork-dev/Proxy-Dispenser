interface Config {
  activity?: {
    name: string;
    type: string;
  };
  services: Array<{
    name: string;
    emoji?: string;
    masqr: boolean;
  }>;
}
