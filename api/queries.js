var promise = require('bluebird');

var options = {
  // Initialization Options
  promiseLib: promise
};

var pgp = require('pg-promise')(options);
if (process.env.DATABASE_URL) {
  pgp.pg.defaults.ssl = true;
}
var connectionString = process.env.DATABASE_URL || 'postgres://127.0.0.1:5432/stagehand';
var db = pgp(connectionString);


/////////////////////
// Query Functions
/////////////////////

function getAllResaData(req, res, next) {
  db.any('SELECT id, stagersFirstName, stagersLastName, propertyAddress, propertyCity, propertyState, propertyZip, dateListed, dateSold, listPrice, soldPrice, listingPriceRange, serviceProvided FROM stagerdata ORDER BY id DESC')
    .then((data) => {
      res.status(200)
        .json({
          status: 'success',
          data: data,
          message: 'Retrieved all stager data'
        });
    })
    .catch((err) => {
      return next(err);
    });
}

function getResaData(req, res, next) {
  var id = parseInt(req.params.id);
  db.one('SELECT id, stagersFirstName, stagersLastName, propertyAddress, propertyCity, propertyState, propertyZip, dateListed, dateSold, listPrice, soldPrice, listingPriceRange, serviceProvided FROM stagerdata WHERE id = $1', id)
    .then((data) => {
      res.status(200)
        .json({
          status: 'success',
          data: data,
          message: 'Retrieved one stager data entry'
        });
    })
    .catch((err) => {
      return next(err);
    });
}

function getAllStagerData(req, res, next) {
  db.any('SELECT * FROM stagerdata ORDER BY id DESC')
    .then((data) => {
      res.status(200)
        .json({
          status: 'success',
          data: data,
          message: 'Retrieved all stager data'
        });
    })
    .catch((err) => {
      return next(err);
    });
}

function getStagerData(req, res, next) {
  var id = parseInt(req.params.id);
  db.one('SELECT * FROM stagerdata WHERE id = $1', id)
    .then((data) => {
      res.status(200)
        .json({
          status: 'success',
          data: data,
          message: 'Retrieved one stager data entry'
        });
    })
    .catch((err) => {
      return next(err);
    });
}

function createStagerData(req, res, next) {
  clean(req.body);

  req.body.propertyZip = parseInt(req.body.propertyZip);
  if (req.body.listPrice) {
    req.body.listPrice = parseInt(req.body.listPrice)
  };
  if (req.body.soldPrice) {
    req.body.soldPrice = parseInt(req.body.soldPrice)
  };
  if (req.body.createdBy) {
    req.body.createdBy = parseInt(req.body.createdBy)
  };

  console.log(req.body);

  db.none('INSERT INTO stagerdata(stagersFirstName, stagersLastName, listingRealtor, propertyAddress, propertyCity, propertyState, propertyZip, dateListed, dateFirstOffer, dateUnderContract, dateSold, listPrice, soldPrice, serviceDate, listingPriceRange, serviceProvided, homeOwnersName, createdBy)' +
      'values(${stagersFirstName}, ${stagersLastName}, ${listingRealtor}, ${propertyAddress}, ${propertyCity}, ${propertyState}, ${propertyZip}, ${dateListed}, ${dateFirstOffer}, ${dateUnderContract}, ${dateSold}, ${listPrice}, ${soldPrice}, ${serviceDate}, ${listingPriceRange}, ${serviceProvided}, ${homeOwnersName}, ${createdBy})',
      req.body)
    .then(() => {
      res.status(200)
        .json({
          status: 'success',
          message: 'Inserted one entry'
        });
    })
    .catch((err) => {
      return next(err);
    });
}

function updateStagerData(req, res, next) {
  clean(req.body)
  db.none('UPDATE stagerdata SET stagersFirstName=$1, stagersLastName=$2, listingRealtor=$3, propertyAddress=$4, propertyCity=$5, propertyState=$6, propertyZip=$7, dateListed=$8, dateFirstOffer=$9, dateUnderContract=$10, dateSold=$11, listPrice=$12, soldPrice=$13, serviceDate=$14, listingPriceRange=$15, serviceProvided=$16, homeOwnersName=$17, createdBy=$18, modified=$19', [req.body.stagersFirstName, req.body.stagersLastName, req.body.listingRealtor, req.body.propertyAddress, req.body.propertyCity, req.body.propertyState, req.body.propertyZip, req.body.dateListed, req.body.dateFirstOffer, req.body.dateUnderContract, req.body.dateSold, req.body.listPrice, req.body.soldPrice, req.body.serviceDate, req.body.listingPriceRange, req.body.serviceProvided, req.body.homeOwnersName, req.body.createdBy, now()])
    .then(() => {
      res.status(200)
        .json({
          status: 'success',
          message: 'Updated entry'
        });
    })
    .catch((err) => {
      return next(err);
    });
}

// function removeStagerData(req, res, next) {
//   var id = parseInt(req.params.id);
//   db.result('DELETE FROM stagerdata WHERE id = $1', id)
//     .then((result) => {
//       /* jshint ignore:start */
//       res.status(200)
//         .json({
//           status: 'success',
//           message: 'Removed entry ${result.rowCount} from stager data'
//         });
//       /* jshint ignore:end */
//     })
//     .catch(err) => {
//       return next(err);
//     });
// }

function resaStatistics(req, res, next) {
  db.any('SELECT id, stagersFirstName, stagersLastName, propertyAddress, propertyCity, propertyState, propertyZip, dateListed, dateSold, listPrice, soldPrice, listingPriceRange, serviceProvided FROM stagerdata ORDER BY id DESC')
    .then((data) => {
      var totalDOM = 0;
      var avgDOM = 0;
      var totalDOMstaged = 0;
      var avgDOMstaged = 0;
      var avgDOMBeforeStaged = 0;
      var totalAboveListPrice = 0;
      var avgAboveListPrice = 0;
      var totalAboveListPricePercentage = 0;
      var avgAboveListPricePercentage = 0;
      var i = 0;
      data.forEach((record) => {
        var dateListed = new Date(record.datelisted);
        var serviceDate = new Date(record.servicedate);
        var dateUnderContract = new Date(record.dateundercontract);

        record.aboveListPrice = Math.floor(record.soldprice - record.listprice);
        record.aboveListPricePercetage = Math.floor((record.soldprice / record.listprice) * 100);

        totalAboveListPrice += record.aboveListPrice;
        totalAboveListPricePercentage += record.aboveListPricePercetage;

        record.dom = Math.floor((dateUnderContract - dateListed) / 86400000);
        record.domStaged = Math.floor((dateUnderContract - serviceDate) / 86400000);
        record.domBeforeStaged = record.dom - record.domStaged;

        totalDOM += record.dom;
        totalDOMstaged += record.domStaged;

        i++;
      })
      avgDOM = Math.floor(totalDOM / i);
      console.log("totalDOM: ", totalDOM, " / i: ", i, " = avgDOM: ", avgDOM);
      avgDOMstaged = Math.floor(totalDOMstaged / i);
      avgDOMBeforeStaged = (avgDOM - avgDOMstaged);
      console.log("totalDOMStaged: ", totalDOMstaged, " / i: ", i, " = avgDOMStaged: ", avgDOMstaged);
      avgAboveListPrice = Math.floor(totalAboveListPrice / i);
      // console.log("totalAboveListPrice: ", totalAboveListPrice, " / i: ", i, " = avgAboveListPrice: ", avgAboveListPrice);
      avgAboveListPricePercentage = totalAboveListPricePercentage / i;
      console.log("totalAboveListPricePercentage: ", totalAboveListPricePercentage, " / i: ", i, " = avgAboveListPricePercentage: ", avgAboveListPricePercentage);
      // clean(data);
      res.status(200)
        .json({
          status: 'success',
          avgDOM: avgDOM,
          avgDOMBeforeStaged: avgDOMBeforeStaged,
          avgDOMstaged: avgDOMstaged,
          avgAboveListPrice: avgAboveListPrice,
          avgAboveListPricePercentage: avgAboveListPricePercentage,
          data: data,
          message: 'Retrieved all stager data'
        });
    })
    .catch((err) => {
      return next(err);
    });
}

function stagerStatistics(req, res, next) {
  db.any('SELECT * FROM stagerdata ORDER BY id DESC')
    .then((data) => {
      var totalDOM = 0;
      var avgDOM = 0;
      var totalDOMstaged = 0;
      var avgDOMstaged = 0;
      var avgDOMBeforeStaged = 0;
      var totalAboveListPrice = 0;
      var avgAboveListPrice = 0;
      var totalAboveListPricePercentage = 0;
      var avgAboveListPricePercentage = 0;
      var i = 0;
      data.forEach((record) => {
        var dateListed = new Date(record.datelisted);
        var serviceDate = new Date(record.servicedate);
        var dateUnderContract = new Date(record.dateundercontract);

        record.aboveListPrice = Math.floor(record.soldprice - record.listprice);
        record.aboveListPricePercetage = Math.floor((record.soldprice / record.listprice) * 100);

        totalAboveListPrice += record.aboveListPrice;
        totalAboveListPricePercentage += record.aboveListPricePercetage;

        record.dom = Math.floor((dateUnderContract - dateListed) / 86400000);
        record.domStaged = Math.floor((dateUnderContract - serviceDate) / 86400000);
        record.domBeforeStaged = record.dom - record.domStaged;

        totalDOM += record.dom;
        totalDOMstaged += record.domStaged;

        i++;
      })
      avgDOM = Math.floor(totalDOM / i);
      // console.log("totalDOM: ", totalDOM, " / i: ", i, " = avgDOM: ", avgDOM);
      avgDOMstaged = Math.floor(totalDOMstaged / i);
      avgDOMBeforeStaged = avgDOM - avgDOMstaged;
      // console.log("totalDOMStaged: ", totalDOMstaged, " / i: ", i, " = avgDOMStaged: ", avgDOMstaged);
      avgAboveListPrice = Math.floor(totalAboveListPrice / i);
      // console.log("totalAboveListPrice: ", totalAboveListPrice, " / i: ", i, " = avgAboveListPrice: ", avgAboveListPrice);
      avgAboveListPricePercentage = totalAboveListPricePercentage / i;
      // console.log("totalAboveListPricePercentage: ", totalAboveListPricePercentage, " / i: ", i, " = avgAboveListPricePercentage: ", avgAboveListPricePercentage);
      // clean(data);
      res.status(200)
        .json({
          status: 'success',
          avgDOM: avgDOM,
          avgDOMBeforeStaged: avgDOMBeforeStaged,
          avgDOMstaged: avgDOMstaged,
          avgAboveListPrice: avgAboveListPrice,
          avgAboveListPricePercentage: avgAboveListPricePercentage,
          data: data,
          message: 'Retrieved all stager data'
        });
    })
    .catch((err) => {
      return next(err);
    });
}

function stagerSingleStatistic(req, res, next) {
  var id = parseInt(req.params.id);
  db.one('SELECT * FROM stagerdata WHERE id = $1', id)
    .then((data) => {

      var dateListed = new Date(data.datelisted);
      var serviceDate = new Date(data.servicedate);
      var dateUnderContract = new Date(data.dateundercontract);

      data.aboveListPrice = data.soldprice - data.listprice;
      data.aboveListPricePercetage = Math.floor((data.soldprice / data.listprice) * 100);

      data.dom = Math.floor((dateUnderContract - dateListed) / 86400000);
      data.domStaged = Math.floor((dateUnderContract - serviceDate) / 86400000);
      data.domBeforeStaged = data.dom - data.domStaged;


      res.status(200)
        .json({
          status: 'success',
          data: data,
          message: 'Retrieved single stager data'
        });
    })
    .catch((err) => {
      return next(err);
    });
}

function resaSingleStatistic(req, res, next) {
  var id = parseInt(req.params.id);
  db.one('SELECT id, stagersFirstName, stagersLastName, propertyAddress, propertyCity, propertyState, propertyZip, dateListed, dateSold, listPrice, soldPrice, listingPriceRange, serviceProvided FROM stagerdata WHERE id = $1', id)
    .then((data) => {

      var dateListed = new Date(data.datelisted);
      var serviceDate = new Date(data.servicedate);
      var dateUnderContract = new Date(data.dateundercontract);

      data.aboveListPrice = data.soldprice - data.listprice;
      data.aboveListPricePercetage = Math.floor((data.soldprice / data.listprice) * 100);

      data.dom = Math.floor((dateUnderContract - dateListed) / 86400000);
      data.domStaged = Math.floor((dateUnderContract - serviceDate) / 86400000);
      data.domBeforeStaged = data.dom - data.domStaged;


      res.status(200)
        .json({
          status: 'success',
          data: data,
          message: 'Retrieved single stager data'
        });
    })
    .catch((err) => {
      return next(err);
    });
}

function clean(obj) {
  for (var key in obj) {
    if (obj[key] === undefined || obj[key] === '' || obj[key] === NaN) {
      obj[key] = null;
    }
  }
  obj.propertyZip = parseInt(obj.propertyZip);
  if (obj.listPrice) {
    obj.listPrice = parseInt(obj.listPrice)
  };
  if (obj.soldPrice) {
    obj.soldPrice = parseInt(obj.soldPrice)
  };
  if (obj.createdBy) {
    obj.createdBy = parseInt(obj.createdBy)
  };
}

/////////////
// Exports
/////////////

module.exports = {
  // getAllResaData: getAllResaData,
  // getResaData: getResaData,
  // getAllStagerData: getAllStagerData,
  // getStagerData: getStagerData,
  createStagerData: createStagerData,
  updateStagerData: updateStagerData,
  // removeStagerData: removeStagerData,
  resaStatistics: resaStatistics,
  stagerStatistics: stagerStatistics,
  stagerSingleStatistic: stagerSingleStatistic,
  resaSingleStatistic: resaSingleStatistic
};
