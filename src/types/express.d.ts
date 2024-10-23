import NintendoCertificate from '@/nintendo-certificate';
import { HydratedRNIDDocument } from '@/types/mongoose/rnid';
import { HydratedNEXAccountDocument } from '@/types/mongoose/nex-account';
import { HydratedDeviceDocument } from '@/types/mongoose/device';

declare global {
	namespace Express {
		interface Request {
			rnid: HydratedRNIDDocument | null;
			nexAccount: HydratedNEXAccountDocument | null;
			isCemu?: boolean;
			files?: Record<string, any>;
			certificate?: NintendoCertificate;
			device?: HydratedDeviceDocument;
		}
	}
}