'use strict';

angular.module('panelApp')
  .controller('MainCtrl', ['$scope', '$interval', 'panelFactory', function ($scope, $interval, panelFactory) {

      const AUTO_REFRESH_TIME = 10000;
      const DELIVERY_DEVIATION_PARM_SECONDS = 28800;// 8 hours
      const SIGNAL_R_INIT_TIMEOUT = 800;
      
      // SignalR method (server sends data via broadcastMessage method)
      $scope.connectionClass = "td-bg-danger";
      $scope.dataHub = null;
      $scope.dataHub = $.connection.dataHub;
      
      // required for smooth operation of signal r. (if this delay is not present, inconsistent behavior happens)
      setTimeout(function () {
          $.connection.hub.start().done(function () {
              $scope.signalRTestConnection();
          });
      }, SIGNAL_R_INIT_TIMEOUT);

      $scope.dataHub.client.broadcastMessage = function () {
          $scope.doUpdateData();
          $scope.lastUpdateDate = new Date();
          $scope.$apply(); //digest (update $scope and dynamic html)
      }

      $scope.dataHub.client.okConnection = function () {
          setTimeout(function () {
              $scope.connectionClass = "td-bg-success";
              $scope.isTestingConnection = false;
              $scope.$apply();
          }, 1000);
      }

      $scope.isTestingConnection = false;
      //SignalR call server method
      $scope.signalRTestConnection = function () {
          try {
              $scope.isTestingConnection = true;
              $scope.dataHub.server.testConnection();
          }
          catch(ex){
              $scope.connectionClass = "td-bg-danger";
              $scope.isTestingConnection = false;
          }
          $scope.$apply();
          //$scope.chatHub.server.sendMessage($scope.name, $scope.message);
      }
      //...............................................................
      

      $scope.showOrders = false;
      $scope.ordersMsg = 'Cargando ordenes...';
      $scope.showTypes = false;
      $scope.typesMsg = 'Cargando tipos...';
      $scope.showSites = false;
      $scope.sitesMsg = 'Cargando sitios...';
      $scope.isUpdating = false;

      $scope.filtSite = '';
      $scope.filtType = '';
      $scope.filtSiteName = '';
      $scope.filtTypeName = '';
      $scope.lastUpdateDate = new Date();

      $scope.deliveryDeviationClassesArray = {};

      $scope.sortType = 'registrationNumber';
      $scope.sortReverse = false;

      $scope.getInitialTableHeight = function () {
          var currentHeight = $(window).height();
          if (currentHeight < 120) {
              currentHeight = 120 * 2;
          }
          return currentHeight - 120;
      }

      $scope.doUpdateData = function () {
          $scope.isUpdating = true;
          setTimeout(function () {
              //JSON-SERVER METHOD (LOCALHOST:3000 - WEB API)
              /*
              return panelFactory.getOrders().query(
              function (response) {
                  $scope.orders = response;
                  $scope.showOrders = true;
                  $scope.lastUpdateDate = new Date();
                  $scope.isUpdating = false;
              },
              function (response) {
                  $scope.ordersMsg = 'Error cargando ordenes: ' + response.status + ' ' + response.statusText;
                  $scope.showOrders = false;
                  $scope.isUpdating = false;
              });
              */

              // HARD-CODED DATA IN SERVICES.JS
              $scope.showOrders = true;
              $scope.isUpdating = false;
              return panelFactory.getHardCodedOrders();
          }, 1000)
      }

      //JSON-SERVER METHOD (LOCALHOST:3000 - WEB API)
      /*
      $scope.caseTypes = panelFactory.getCaseTypes().query(
          function (response) {
              $scope.caseTypes = response;
              $scope.showTypes = true;
          },
          function (response) {
              $scope.typesMsg = 'Error cargando tipos: ' + response.status + ' ' + response.statusText;
              $scope.showTypes = false;
          });
      */
      // HARD-CODED DATA IN SERVICES.JS
      $scope.caseTypes = panelFactory.getHardCodedCaseTypes();
      $scope.showTypes = true;

      $scope.selectType = function (type) {
          $scope.filtType = type.id;
      }


      //JSON-SERVER METHOD (LOCALHOST:3000 - WEB API)
      /*
      $scope.inventSites = panelFactory.getInventSites().query(
          function (response) {
              $scope.inventSites = response;
              $scope.showSites = true;
          },
          function (response) {
              $scope.sitesMsg = 'Error cargando sitios: ' + response.status + ' ' + response.statusText;
              $scope.showSites = false;
          });
      */
      // HARD-CODED DATA IN SERVICES.JS
      $scope.inventSites = panelFactory.getHardCodedInventSites();
      $scope.showSites = true;

      $scope.selectSite = function (site) {
          $scope.filtSite = site.id;
          $scope.filtSiteName = site.name;
      }

      $scope.idIsFiltSite = function (site) {
          return site.id === $scope.filtSite;
      }

      $scope.isSiteSelected = function (id) {
          if ($scope.filtSite === id){
              return true;
          }
          return false;
      }

      $scope.doUpdateData();
      $interval(function () { $scope.doUpdateData(); }, AUTO_REFRESH_TIME);

      $scope.deliveredPercentage = function (tasks) {
          var elapsedSeconds = $scope.getElapsedSeconds(tasks);
          var totalSeconds = $scope.getTotalSeconds(tasks);

          if (totalSeconds === 0) {
              return "-";
          }

          // multiply by 10 and then divide to get one decimal place.

          var ret = Math.round(10 * 100 * (elapsedSeconds / totalSeconds));

          return ret / 10;
      }

      $scope.tasksStatus = function (timeSheetTasks) {
          
          var finishedTasks = 0;
          var inProcessTasks = 0;
          var pendingTasks = 0;
          try
          {
              for (var i = 0 ; i < timeSheetTasks.length ; i++) {

                  switch (timeSheetTasks[i].status) {
                      case "Finalizado":// all transactions are finished in AX.
                          finishedTasks++;
                          break;

                      case "En proceso":// last transaction is running for this task in AX
                          inProcessTasks++;
                          break;

                      case "Por iniciar":
                          pendingTasks++;
                          break;
                  }
              }
          }
          catch (ex) {//debug only
              window.alert(ex.message);
          }
          return [finishedTasks, inProcessTasks, pendingTasks];
      }

      $scope.totStatus = function (timeSheetTasks)
      {
          try{
              var tasksStatus = $scope.tasksStatus(timeSheetTasks);
              if (tasksStatus[0] <= 0 && tasksStatus[1] <= 0)
              {
                  // this record has no transactions whatsoever...
                  return "No Iniciado";
              }

              if (tasksStatus[1] > 0 )
              {
                  return "En proceso";
              }

              // has transactions but none of them has started.
              return "Finalizado";
          }
          catch (ex){ //debug only
              window.alert(ex.message);
          }
      }

      $scope.showPendingTasks = function (tasks) {
          var tasksStatus = $scope.tasksStatus(tasks);
          if (tasksStatus[2] > 0){
              return true;
          }
          return false;
      }
      $scope.getNumberOfPendingTasks = function (tasks) {
          return $scope.tasksStatus(tasks)[2];
      }

      $scope.showInProcessTasks = function (tasks) {
          try{
              var tasksStatus = $scope.tasksStatus(tasks);
              if (tasksStatus[1] > 0) {
                  return true;
              }
              return false;
          }
          catch (ex) {
              window.alert(ex.message)
          }
      }
      $scope.getNumberOfInProcessTasks = function (tasks) {
          return $scope.tasksStatus(tasks)[1];
      }

      $scope.showFinishedTasks = function (tasks) {
          var tasksStatus = $scope.tasksStatus(tasks);
          if (tasksStatus[0] > 0) {
              return true;
          }
          return false;
      }
      $scope.getNumberOfFinishedTasks = function (tasks) {
          return $scope.tasksStatus(tasks)[0];
      }

      $scope.labelColorClass = function (currentTask) {

          if (currentTask.status == "En proceso"){
              return "label-success";
          }

          if (currentTask.status == "Por iniciar"){
              return "label-warning";
          }

          return "label-danger";
      }

      $scope.getElapsedSeconds = function(tasks)
      {
          var ret = 0;
          for (var i = 0 ; i < tasks.length ; i++) {
              ret += tasks[i].elapsedSeconds;
          }
          return ret;
      }

      $scope.getTotalSeconds = function (tasks) {
          var ret = 0;
          for (var i = 0 ; i < tasks.length ; i++) {
              ret += (tasks[i].hours * tasks[i].qty * 3600);
          }
          return ret;
      }

      $scope.getDeliveryDeviation = function (schedDate, schedTime) {

          var valuesArray = $scope.getDiffFromCurrentDateTime(schedDate, schedTime);

          var diffSeconds = valuesArray[0];
          var diffDaysRound = valuesArray[1];
          var diffHoursRound = valuesArray[2];
          var diffMinutesRound = valuesArray[3];

          var ret = "";

          if (diffDaysRound != 0) {
              ret = diffDaysRound + "d, ";
          }

          if (diffHoursRound != 0){
              ret += diffHoursRound + "h:" + diffMinutesRound + "m";
          }
          else {
              ret += diffMinutesRound + "m";
          }

          var sign = "";

          if (diffSeconds < 0) {
              sign = "-";
          }

          return sign + ret;
      }

      $scope.getDeliveryDeviationClass = function (schedDate, schedTime) {

          var valuesArray = $scope.getDiffFromCurrentDateTime(schedDate, schedTime);

          var diffSeconds = valuesArray[0];

          if (0 < diffSeconds && diffSeconds < DELIVERY_DEVIATION_PARM_SECONDS) { // yellow background
              return "td-bg-warning";
          }

          if (diffSeconds > DELIVERY_DEVIATION_PARM_SECONDS) { // red background
              return "td-bg-danger";
          }

          return "td-bg-success"; // green background
      }

      $scope.getDiffFromCurrentDateTime = function (schedDate, schedTime) {
          try
          {
              var oneDay = 24 * 60 * 60; // number of seconds in one day

              var currentDate = new Date();
              var schedDateTime = new Date(schedDate + " " + schedTime);
             
              var diff = (currentDate.getTime() - schedDateTime.getTime())/1000;

              var diffDays = diff / oneDay;
              var diffDaysRound = Math.floor(Math.abs(diffDays));

              var diffHours = (Math.abs(diffDays) - diffDaysRound) * 24;
              var diffHoursRound = Math.floor(Math.abs(diffHours));

              var diffMinutes = (Math.abs(diffHours) - diffHoursRound) * 60;
              var diffMinutesRound = Math.floor(Math.abs(diffMinutes));

              return [diff, diffDaysRound, diffHoursRound, diffMinutesRound];

          }
          catch(ex){ // debug only...
              window.alert(ex.message);
          }
      }

      $scope.toDateTime = function toDateTime(seconds) {
          var date = new Date();
          date.setSeconds(seconds);
          return date;
      }

      $scope.getDays = function (seconds) {
          var oneDay = 24 * 60 * 60;
          return Math.floor(Math.abs(seconds / oneDay));
      }



      /*
      USING SIGNAL R TO GET DATA
      */
      /*
      $scope.currentRamMemory = 0;
      console.log('trying to connect to service');
      var dataHub = backendHubProxy(backendHubProxy.defaultServer, 'dataHub');
      console.log('Connected to service');

      dataHub.on('broadcastPerformance', function (data) {
          data.forEach(function (dataItem) {
              switch (dataItem.categoryName) {
                  case 'Memory':
                      $scope.currentRamMemory = dataItem.value;
              }
          })
      })
      */







  }]);

