(function () {
  "use strict";

  angular
    .module("mnSettingsSampleBucketsService", [
      "mnHttp",
      "mnPoolDefault",
      "mnTasksDetails",
      "mnBucketsService",
      "mnServersService"
    ])
    .factory("mnSettingsSampleBucketsService", mnSettingsSampleBucketsFactory);

  function mnSettingsSampleBucketsFactory(mnHttp, $q, mnPoolDefault, mnTasksDetails, mnBucketsService, mnServersService) {
    var mnSettingsSampleBucketsService = {
      getSampleBuckets: getSampleBuckets,
      installSampleBuckets: installSampleBuckets,
      getSampleBucketsState: getSampleBucketsState
    };

    return mnSettingsSampleBucketsService;

    function getSampleBucketsState(selectedBuckets) {
      return $q.all([
        getSampleBuckets(),
        mnPoolDefault.get(),
        mnTasksDetails.get(),
        mnBucketsService.getBucketsByType(true),
        mnServersService.getNodes()
      ]).then(function (resp) {
        var warnings = {
          quota: false,
          rebalance: false,
          maxBucketCount: false
        };
        var sampleBuckets = resp[0].data;
        var poolDefault = resp[1];
        var tasks = resp[2];
        var buckets = resp[3];
        var servers = resp[4];

        var numServers = servers.active.length;
        var quotaAvailable = poolDefault.storageTotals.ram.quotaTotal - poolDefault.storageTotals.ram.quotaUsed;
        var maxNumBuckets = poolDefault.maxBucketCount;
        var numExistingBuckets = buckets.length;

        var storageNeeded = _.reduce(selectedBuckets, function (acc, quotaNeeded) {
          return acc + parseInt(quotaNeeded, 10);
        }, 0) * numServers;

        if (!(storageNeeded <= quotaAvailable)) {
          warnings.quota = Math.ceil(storageNeeded - quotaAvailable) / 1024 / 1024 / numServers;
        }
        warnings.maxBucketCount = (numExistingBuckets + _.keys(selectedBuckets).length > maxNumBuckets) && maxNumBuckets;
        warnings.rebalance = tasks.inRebalance;

        return {
          installed: _.filter(sampleBuckets, 'installed', true),
          available: _.filter(sampleBuckets, 'installed', false),
          warnings: warnings
        };
      });
    }
    function getSampleBuckets() {
      return mnHttp({
        url: '/sampleBuckets',
        method: 'GET'
      });
    }
    function installSampleBuckets(selectedSamples) {
      return mnHttp({
        url: '/sampleBuckets/install',
        method: 'POST',
        timeout: 140000,
        data: JSON.stringify(_.keys(_.pick(selectedSamples, _.identity)))
      });
    }
  }
})();
