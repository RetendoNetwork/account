import { YesNoBoolString } from '@/types/common/yes-no-bool-string';
import { IDeviceAttribute } from '@/types/mongoose/device-attribute';

export interface Person {
	birth_date: string;
	user_id: string;
	password: string;
	country: string;
	language: string;
	tz_name: string;
	agreement: {
		agreement_date: string;
		country: string;
		location: string;
		type: string;
		version: string;
	};
	email: {
		address: string;
		owned: YesNoBoolString;
		parent: YesNoBoolString;
		primary: YesNoBoolString;
		validated: YesNoBoolString;
		type: string;
	};
	mii: {
		name: string;
		primary: YesNoBoolString;
		data: string;
	};
	parental_consent: {
		scope: string;
		consent_date: string;
		approval_id: string;
	};
	gender: string;
	region: number;
	marketing_flag: YesNoBoolString;
	device_attributes: {
		device_attribute: IDeviceAttribute[]
	};
	off_device_flag: YesNoBoolString;
}