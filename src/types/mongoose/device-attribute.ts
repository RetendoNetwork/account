import { Model } from 'mongoose';

export interface IDeviceAttribute {
	created_date?: string;
	name: string;
	value: string;
}

export interface IDeviceAttributeMethods {}

interface IDeviceAttributeQueryHelpers {}

export type DeviceAttributeModel = Model<IDeviceAttribute, IDeviceAttributeQueryHelpers, IDeviceAttributeMethods>