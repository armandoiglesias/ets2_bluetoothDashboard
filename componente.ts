import { Component } from '@angular/core';

//import { BluetoothSerial } from 'ionic-native';

import { BluetoothSerial } from '@ionic-native/bluetooth-serial/ngx';


@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {

  dispositivos: any = [];
  dispositivo_activo:string = "";

  constructor(private bluetoothSerial: BluetoothSerial) {
    this.dispositivos.push({ nombre: "dispositivo2", id: 2 });
    this.dispositivos.push({ nombre: "dispositivo3", id: 3 });
    this.dispositivos.push({ nombre: "dispositivo1", id: 1 });

    //this.buscar();
  }

  connect(cadena: string) {
    console.log(cadena);

    this.bluetoothSerial.isEnabled().then(res => {

      this.bluetoothSerial.connect(cadena);
      this.bluetoothSerial.isConnected().then(res => {
        console.log(res);
        this.dispositivo_activo = cadena;
        // this.bluetoothSerial.write('1').then(success => {
        //   console.log(success);
        // }, failure => { });

      }).catch(res => {
        console.log('Fail2!');
        console.log(res);
      });

    }).catch(res => {
      console.log('Fail!');
      //console.log(res);
    });

  }

  buscar() {

    this.bluetoothSerial.isEnabled().then(res => {

      this.bluetoothSerial.list().then(listado => {
        console.log(listado);
        this.dispositivos = [];
        // listado.forEach(element => {
        //   this.dispositivos.push({ id: element.id, nombre: element.name });
        // });
      });

    }).catch(res => {
      console.log('Fail!');
    });
  }

  reconectar(){

  }

  mandarComando(comando){
    //this.bluetoothSerial.connect(this.dispositivo_activo);
    this.bluetoothSerial.isConnected().then(res => {
      console.log(res);
      //this.dispositivo_activo = cadena;
      this.bluetoothSerial.write(comando).then(success => {
        console.log(success);
      }, failure => { });


    }).catch(res => {
      console.log('Fail enviando!');
      console.log(res);
    });

  }

}


