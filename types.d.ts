import type { Client } from "seyfert";

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			/** Discord Bot Token. */
			DISCORD_TOKEN: string;
			/** Database local file path. */
			DATABASE_URL: string;

			/** Masqr URL. */
			MASQR_URL: string;
			/** Masqr API key. */
			MASQR_PSK: string;

			/** FC URL. */
			FC_URL: string;
			/** FC API key. */
			FC_API_KEY: string;

			/** BYOD URL. */
			BYOD_API_IP: string;
			/** BYOD API PORT. */
			BYOD_API_PORT: string;
			/** BYOD API key. */
			BYOD_API_KEY: string;
		}
	}
}

declare module "seyfert" {
	interface UsingClient extends ParseClient<Client<true>> {}
}
