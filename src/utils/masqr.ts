export interface MasqrResult {
	readonly ok: true;
	readonly link: string;
}

export interface MasqrFailure {
	readonly ok: false;
	readonly error: string;
}

export type MasqrApplyResult = MasqrResult | MasqrFailure;

export async function applyMasqr(link: string): Promise<MasqrApplyResult> {
	if (!process.env.MASQR_URL || !process.env.MASQR_PSK) {
		return {
			ok: false,
			error:
				"Masqr is enabled for this category, but MASQR_URL or MASQR_PSK is not configured.",
		};
	}

	const parsed = new URL(link);

	let response: Response;
	try {
		response = await fetch(
			`${process.env.MASQR_URL.replace(/\/$/, "")}/newLicense?host=${encodeURIComponent(parsed.host)}`,
			{
				method: "GET",
				headers: {
					psk: process.env.MASQR_PSK,
				},
			},
		);
	} catch {
		return {
			ok: false,
			error: "Failed to reach the Masqr licensing server.",
		};
	}

	if (!response.ok) {
		return {
			ok: false,
			error: "Masqr licensing server returned an error.",
		};
	}

	const payload = (await response.json()) as {
		assignedLicense?: string;
	};

	if (!payload.assignedLicense) {
		return {
			ok: false,
			error: "Masqr licensing server did not provide a license.",
		};
	}

	parsed.username = "u";
	parsed.password = payload.assignedLicense;

	return {
		ok: true,
		link: parsed.href,
	};
}
