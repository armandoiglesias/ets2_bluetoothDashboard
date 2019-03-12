import { Component } from '@angular/core';
import { BluetoothLE } from '@ionic-native/bluetooth-le/ngx';
import { Platform } from "@ionic/angular";
import { ToastController } from '@ionic/angular';


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  logs: string = "";
  dispositivos: any = [];
  MostrarScan: boolean = true;
  conectado: string = "";

  _serviceID:string = "";
  _address:string = "";
  _characteristic:string = "";

  constructor(private bluetoothle: BluetoothLE, public plt: Platform, public toastController: ToastController) {
    this.plt.ready().then((readySource) => {
      console.log('Platform ready from', readySource);
      this.bluetoothle.initialize({ request: true }).then( this.initializeSuccess, this.handleError );
    });
  }

  initializeSuccess(result) {
    if (result.status === "enabled") {
      this.log("Bluetooth is enabled.");
      this.log(result);
    }
    else {
      this.MostrarScan = false;
      this.log("Bluetooth is not enabled:", "status");
      this.log(result, "status");
    }
  }

  handleError(error) {
    var msg;
    if (error.error && error.message) {
      var errorItems = [];
      if (error.service) {
        errorItems.push("service: " + (error.service));
      }

      if (error.characteristic) {
        errorItems.push("characteristic: " + (error.characteristic));
      }

      msg = "Error on " + error.error + ": " + error.message + (errorItems.length && (" (" + errorItems.join(", ") + ")"));
    }

    else {
      msg = error;
    }

    this.log(msg, "error");
    if (error.error === "read" && error.service && error.characteristic) {
      this.reportValue(error.service, error.characteristic, "Error: " + error.message);
    }
  }

  log(msg, level = "log") {
    if (typeof msg === "object") {
      this.logs += JSON.stringify(msg, null, "  ");
    }

    if (level === "status" || level === "error") {
      this.logs += msg;
      if (level === "error") {
        this.logs += "************** red   ****************";
      }
    }
    this.logs += "\n";
  }

  startScan() {

    this.log("Starting scan for devices...", "status");
    this.dispositivos = [];
    if ( this.plt.is( "desktop")) {
      this.bluetoothle.retrieveConnected({}).then(this.retrieveConnectedSuccess, this.handleError);
    }
    else {
      let _scan = this.bluetoothle.startScan({ services: [] });
    }
  }

  startScanSuccess(result) {

    this.log("startScanSuccess(" + result.status + ")");
    if (result.status === "scanStarted") {
      this.log("Scanning for devices (will continue to scan until you select a device)...", "status");
    }
    else if (result.status === "scanResult") {
      if (!this.dispositivos.some(function (device) {
        return device.address === result.address;
      })) {
        this.log('FOUND DEVICE:');
        this.log(result);
        this.dispositivos.push(result);
        //addDevice(result.name, result.address);
      }
    }
  }

  retrieveConnectedSuccess(result) {
    this.log("retrieveConnectedSuccess()");
    this.log(result);
    result.forEach(function (device) {
      this.dispositivos.push(device);
      //addDevice(device.name, device.address);
    });
  }

  connect(address) {
    this.log('Connecting to device: ' + address + "...", "status");
    if (this.plt.is("desktop")) {
      this.getDeviceServices(address);
    }
    else {
      this.stopScan();
      new Promise(function (resolve, reject) {
        this.bluetoothle.connect(resolve, reject, { address: address });
      }).then(this.connectSuccess, this.handleError);
    }
  }

  stopScan() {
    new Promise(function (resolve, reject) {
      this.bluetoothle.stopScan(resolve, reject);
    }).then(this.stopScanSuccess, this.handleError);
  }

  stopScanSuccess() {
    if (!this.dispositivos.length) {
      this.log("NO DEVICES FOUND");
    }
    else {
      this.log("Found " + this.dispositivos.length + " devices.", "status");
    }
  }

  connectSuccess(result) {
    this.log("- " + result.status);
    if (result.status === "connected") {
      this.getDeviceServices(result.address);
    }
    else if (result.status === "disconnected") {
      this.log("Disconnected from device: " + result.address, "status");
    }
  }

  getDeviceServices(address) {
    this.log("Getting device services...", "status");

    //var platform = this.plt. window.cordova.platformId;

    if (this.plt.is("android")) {
      new Promise(function (resolve, reject) {
        this.bluetoothle.discover(resolve, reject,
          { address: address });
      }).then(this.discoverSuccess, this.handleError);
    }
    else if (this.plt.is("desktop")) {
      new Promise(function (resolve, reject) {
        this.bluetoothle.services(resolve, reject,
          { address: address });
      }).then(this.servicesSuccess, this.handleError);
    }
    else {
      this.log("Unsupported platform: '" + window.cordova.platformId + "'", "error");
    }
  }

  discoverSuccess(result) {
    this.log("Discover returned with status: " + result.status);
    if (result.status === "discovered") {
      // Create a chain of read promises so we don't try to read a property until we've finished
      // reading the previous property.
      var readSequence = result.services.reduce(function (sequence, service) {
        return sequence.then(function () {
          return this.addService(result.address, service.uuid, service.characteristics);
        });
      }, Promise.resolve());

      // Once we're done reading all the values, disconnect
      readSequence.then(function () {
        new Promise(function (resolve, reject) {
          this.bluetoothle.disconnect(resolve, reject,
            { address: result.address });
        }).then(this.connectSuccess, this.handleError);
      });
    }
  }

  servicesSuccess(result) {
    this.log("servicesSuccess()");
    this.log(result);
    if (result.status === "services") {
      var readSequence = result.services.reduce(function (sequence, service) {
        return sequence.then(function () {
          console.log('Executing promise for service: ' + service);
          new Promise(function (resolve, reject) {
            this.bluetoothle.characteristics(resolve, reject,
              { address: result.address, service: service });
          }).then(this.characteristicsSuccess, this.handleError);
        }, this.handleError);
      }, Promise.resolve());

      // Once we're done reading all the values, disconnect
      readSequence.then(function () {
        new Promise(function (resolve, reject) {
          this.bluetoothle.disconnect(resolve, reject,
            { address: result.address });
        }).then(this.connectSuccess, this.handleError);
      });
    }

    if (result.status === "services") {
      result.services.forEach(function (service) {
        new Promise(function (resolve, reject) {
          this.bluetoothle.characteristics(resolve, reject,
            { address: result.address, service: service });
        }).then(this.characteristicsSuccess, this.handleError);
      });
    }
  }

  characteristicsSuccess(result) {
    this.log("characteristicsSuccess()");
    this.log(result);
    if (result.status === "characteristics") {
      return this.addService(result.address, result.service, result.characteristics);
    }
  }

  readSuccess(result) {
    this.log("readSuccess():");
    this.log(result);
    if (result.status === "read") {
      this.reportValue(result.service, result.characteristic, window.atob(result.value));
    }
  }

  reportValue(serviceUuid, characteristicUuid, value) {
    //document.getElementById(serviceUuid + "." + characteristicUuid).textContent = value;
    this.conectado = value;
  }

  addService(address, serviceUuid, characteristics) {
    this._address = address;
    this._serviceID = serviceUuid;
    this._characteristic = characteristics;
    this.log('Adding service ' + serviceUuid + '; characteristics:');
    this.log(characteristics);
    let readSequence = Promise.resolve();

    var wrapperDiv = document.createElement("div");
    wrapperDiv.className = "service-wrapper";

    var serviceDiv = document.createElement("div");
    serviceDiv.className = "service";
    serviceDiv.textContent = serviceUuid;
    wrapperDiv.appendChild(serviceDiv);

    characteristics.forEach(function (characteristic) {

      // var characteristicDiv = document.createElement("div");
      // characteristicDiv.className = "characteristic";

      // var characteristicNameSpan = document.createElement("span");
      // characteristicNameSpan.textContent = ( characteristic.uuid) + ":";
      // characteristicDiv.appendChild(characteristicNameSpan);

      // characteristicDiv.appendChild(document.createElement("br"));

      // var characteristicValueSpan = document.createElement("span");
      // characteristicValueSpan.id = serviceUuid + "." + characteristic.uuid;
      // characteristicValueSpan.style.color = "blue";
      // characteristicDiv.appendChild(characteristicValueSpan);

      // wrapperDiv.appendChild(characteristicDiv);

      // let readSequence = readSequence.then(function () {

      //     return new Promise(function (resolve, reject) {

      //         this.bluetoothle.read(resolve, reject,
      //             { address: address, service: serviceUuid, characteristic: characteristic.uuid });

      //     }).then(this.readSuccess, this.handleError);

      // });
    });

    //document.getElementById("services").appendChild(wrapperDiv);

    return readSequence;
  }

  EnviarChar(){
    let cadena = "H";
    let cadenabytes = this.bluetoothle.stringToBytes(cadena);
    let encodedString = this.bluetoothle.bytesToEncodedString(cadenabytes);
    this.bluetoothle.write({ value: encodedString, service : this._serviceID , address : this._address, type: "noResponse" , characteristic: this._characteristic }).then( this.sendCharSucess , this.handleError) ;
  }

  async sendCharSucess(){
      const toast = await this.toastController.create({
        message: 'Se envio correctamente.',
        duration: 2000
      });
      toast.present();
    }

}

<ion-header>
  <ion-toolbar>
    <ion-title>
     Bluetooth Screen - Demo
    </ion-title>
  </ion-toolbar>
</ion-header>

<ion-button *ngIf="MostrarScan" (click)="startScan()">Scan</ion-button>

<ion-content padding>
    {{ logs }}
</ion-content>

<ion-content padding>
  <ion-list >
    <ion-item *ngFor="let item of dispositivos" (click)="connect(item.address)">
      <ion-label>{{ item.name  }} - {{ item.address }}</ion-label>
    </ion-item>
  </ion-list>
</ion-content>

<ion-content padding>

    <ion-button color="primary" (click)="EnviarChar()">Enviar H</ion-button>
 
</ion-content>


<ion-grid>
  <ion-row>
    <ion-col size="6">
      <ion-grid>
        <ion-row>
          <ion-col size="6">
            <ion-item>
              <ion-item>
                <ion-button color="light">
                  <ion-img [src]="item.src"></ion-img>
                </ion-button>
              </ion-item>
            </ion-item>
          </ion-col>
          <ion-col size="6">
            <ion-item>
              <ion-item>
                <ion-button color="light">
                  <ion-img [src]="item.src"></ion-img>
                </ion-button>
              </ion-item>
            </ion-item>
          </ion-col>
        </ion-row>
      </ion-grid>
      <ion-grid>
        <ion-row>
          <ion-col size="6">
            <ion-item>
              <ion-item>
                <ion-button color="light">
                  <ion-img [src]="item.src"></ion-img>
                </ion-button>
              </ion-item>
            </ion-item>
          </ion-col>
          <ion-col size="6">
            <ion-item>
              <ion-item>
                <ion-button color="light">
                  <ion-img [src]="item.src"></ion-img>
                </ion-button>
              </ion-item>
            </ion-item>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-col>
    <ion-col size="6">
      <ion-grid>
        <ion-row>
          <ion-col size="4">
            <ion-item>
              <ion-item>
                <ion-button color="light">
                  <ion-img [src]="item.src"></ion-img>
                </ion-button>
              </ion-item>
            </ion-item>
          </ion-col>
          <ion-col size="4">
            <ion-item>
              <ion-item>
                <ion-button color="light">
                  <ion-img [src]="item.src"></ion-img>
                </ion-button>
              </ion-item>
            </ion-item>
          </ion-col>
          <ion-col size="4">
            <ion-item>
              <ion-item>
                <ion-button color="light">
                  <ion-img [src]="item.src"></ion-img>
                </ion-button>
              </ion-item>
            </ion-item>
          </ion-col>
        </ion-row>
      </ion-grid>
      <ion-grid>
        <ion-row>
          <ion-col size="4">
            <ion-item>
              <ion-item>
                <ion-button color="light">
                  <ion-img [src]="item.src"></ion-img>
                </ion-button>
              </ion-item>
            </ion-item>
          </ion-col>
          <ion-col size="4">
            <ion-item>
              <ion-item>
                <ion-button color="light">
                  <ion-img [src]="item.src"></ion-img>
                </ion-button>
              </ion-item>
            </ion-item>
          </ion-col>
          <ion-col size="4">
            <ion-item>
              <ion-item>
                <ion-button color="light">
                  <ion-img [src]="item.src"></ion-img>
                </ion-button>
              </ion-item>
            </ion-item>
          </ion-col>
        </ion-row>
      </ion-grid>
      <ion-grid>
        <ion-row>
          <ion-col size="4">
            <ion-item>
              <ion-item>
                <ion-button color="light">
                  <ion-img [src]="item.src"></ion-img>
                </ion-button>
              </ion-item>
            </ion-item>
          </ion-col>
          <ion-col size="4">
            <ion-item>
              <ion-item>
                <ion-button color="light">
                  <ion-img [src]="item.src"></ion-img>
                </ion-button>
              </ion-item>
            </ion-item>
          </ion-col>
          <ion-col size="4">
            <ion-item>
              <ion-item>
                <ion-button color="light">
                  <ion-img [src]="item.src"></ion-img>
                </ion-button>
              </ion-item>
            </ion-item>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-col>
  </ion-row>
</ion-grid>
