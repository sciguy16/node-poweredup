import { BasicMotor } from "./basicmotor";

import { IHubInterface } from "../interfaces";

import * as Consts from "../consts";
import { mapSpeed } from "../utils";

/**
 * @class TachoMotor
 * @extends BasicMotor
 */
export class TachoMotor extends BasicMotor {

    public static Mode = {
        ROTATION: 0x02
    }

    public static DataSets = {
        [TachoMotor.Mode.ROTATION]: 1
    }

    public static ModeMap: {[event: string]: number} = {
        "rotate": TachoMotor.Mode.ROTATION
    };


    protected _brakeStyle: Consts.BrakingStyle = Consts.BrakingStyle.BRAKE;

    constructor (
        hub: IHubInterface,
        portId: number,
        modeMap: {[event: string]: number} = {},
        dataSets: {[mode: number]: number} = {},
        type: Consts.DeviceType = Consts.DeviceType.UNKNOWN
    ) {
        super(hub, portId, Object.assign({}, modeMap, TachoMotor.ModeMap), Object.assign({}, dataSets, TachoMotor.DataSets), type);
        this._supportsCombined = true;
    }

    public parse (mode: number, message: Buffer) {

        switch (mode) {
            case TachoMotor.Mode.ROTATION:
                const degrees = message.readInt32LE(this.isWeDo2SmartHub ? 2 : 4);
                /**
                 * Emits when a rotation sensor is activated.
                 * @event TachoMotor#rotate
                 * @type {object}
                 * @param {number} rotation
                 */
                this.notify("rotate", { degrees });
                return message.slice(4);
        }

        return message;
    }


    /**
     * Set the braking style of the motor.
     *
     * Note: This applies to setSpeed, rotateByDegrees, and gotoAngle.
     * @method TachoMotor#setBrakingStyle
     * @param {number} style Either BRAKE or HOLD
     */
    public setBrakingStyle (style: Consts.BrakingStyle) {
        this._brakeStyle = style;
    }


    /**
     * Set the motor speed.
     * @method TachoMotor#setSpeed
     * @param {number} speed For forward, a value between 1 - 100 should be set. For reverse, a value between -1 to -100. Stop is 0.
     * @returns {Promise} Resolved upon successful issuance of the command.
     */
    public setSpeed (speed: [number, number] | number, time: number | undefined) {
        if (!this.isVirtualPort && speed instanceof Array) {
            throw new Error("Only virtual ports can accept multiple speeds");
        }
        if (this.isWeDo2SmartHub) {
            throw new Error("Motor speed is not available on the WeDo 2.0 Smart Hub");
        }
        this.cancelEventTimer();
        return new Promise((resolve) => {
            this._busy = true;
            if (speed === undefined || speed === null) {
                speed = 100;
            }
            let message;
            if (time !== undefined) {
                if (speed instanceof Array) {
                    message = Buffer.from([0x81, this.portId, 0x11, 0x0a, 0x00, 0x00, mapSpeed(speed[0]), mapSpeed(speed[1]), 0x64, this._brakeStyle, 0x00]);
                } else {
                    message = Buffer.from([0x81, this.portId, 0x11, 0x09, 0x00, 0x00, mapSpeed(speed), 0x64, this._brakeStyle, 0x00]);
                }
                message.writeUInt16LE(time, 4);
            } else {
                if (speed instanceof Array) {
                    message = Buffer.from([0x81, this.portId, 0x11, 0x08, mapSpeed(speed[0]), mapSpeed(speed[1]), 0x64, this._brakeStyle, 0x00]);
                } else {
                    message = Buffer.from([0x81, this.portId, 0x11, 0x07, mapSpeed(speed), 0x64, 0x03, 0x64, this._brakeStyle, 0x00]);
                }
            }
            this.send(message);
            this._finished = () => {
                return resolve();
            };
        });
    }

    /**
     * Rotate a motor by a given amount of degrees.
     * @method TachoMotor#rotateByDegrees
     * @param {number} degrees How much the motor should be rotated (in degrees).
     * @param {number} [speed=100] For forward, a value between 1 - 100 should be set. For reverse, a value between -1 to -100.
     * @returns {Promise} Resolved upon successful completion of command (ie. once the motor is finished).
     */
    public rotateByDegrees (degrees: number, speed: [number, number] | number) {
        if (!this.isVirtualPort && speed instanceof Array) {
            throw new Error("Only virtual ports can accept multiple speeds");
        }
        if (this.isWeDo2SmartHub) {
            throw new Error("Rotation is not available on the WeDo 2.0 Smart Hub");
        }
        this.cancelEventTimer();
        return new Promise((resolve) => {
            this._busy = true;
            if (speed === undefined || speed === null) {
                speed = 100;
            }
            let message;
            if (speed instanceof Array) {
                message = Buffer.from([0x81, this.portId, 0x11, 0x0c, 0x00, 0x00, 0x00, 0x00, mapSpeed(speed[0]), mapSpeed(speed[1]), 0x64, this._brakeStyle, 0x03]);
            } else {
                message = Buffer.from([0x81, this.portId, 0x11, 0x0b, 0x00, 0x00, 0x00, 0x00, mapSpeed(speed), 0x64, this._brakeStyle, 0x03]);
            }
            message.writeUInt32LE(degrees, 4);
            this.send(message);
            this._finished = () => {
                return resolve();
            };
        });
    }

}
