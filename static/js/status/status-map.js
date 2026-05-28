// ==================== status-map.js ====================
(function() {
    'use strict';

    // 地图初始化（由 StatusManager 调用）
    window._initStatusMap = function(container, statuses, callbacks) {
        var self = {};

        var map = L.map(container, {
            zoomControl: true,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            touchZoom: false,
            dragging: false,
            boxZoom: false,
            keyboard: false,
            attributionControl: false
        }).setView([37.87, 112.55], 3);

        L.tileLayer(window.STATUS_MAP_TILE_URL, {
            attribution: '<img src="https://webapi.amap.com/theme/v2.0/logo@2x.png" style="height:20px; vertical-align:middle;">',
            maxZoom: 7,
            minZoom: 3
        }).addTo(map);

        var markerCluster = L.markerClusterGroup({
            chunkedLoading: true,
            maxClusterRadius: 27,
            spiderfyOnMaxZoom: false,
            showCoverageOnHover: true,
            zoomToBoundsOnClick: true,
            disableClusteringAtZoom: 8,
            iconCreateFunction: function(cluster) {
                var count = cluster.getChildCount();
                var size = 'small';
                if (count > 10) size = 'medium';
                if (count > 20) size = 'large';

                return L.divIcon({
                    html: '<div class="cluster-icon cluster-' + size + '"><span>' + count + '</span></div>',
                    className: 'custom-cluster',
                    iconSize: L.point(40, 40)
                });
            }
        });

        var groups = {};
        var markersMap = {};

        statuses.forEach(function(s) {
            if (s.coords && s.coords.length === 2) {
                var k = s.coords.join(',');
                var locName = s.location ? s.location.split(' · ').pop().trim() : '未知';

                if (!groups[k]) {
                    groups[k] = {
                        name: s.location || '未知',
                        shortName: locName,
                        count: 0,
                        coords: s.coords
                    };
                }
                groups[k].count++;
            }
        });

        var markers = [];

        Object.keys(groups).forEach(function(k) {
            var group = groups[k];
            var marker = L.marker(group.coords, {
                riseOnHover: true
            }).bindPopup('<b>' + group.name + '</b><br>共 ' + group.count + ' 条动态', {
                closeButton: false
            });

            markers.push(marker);

            if (group.shortName && group.shortName !== '未知') {
                markersMap[group.shortName] = marker;
            }

            marker.on('click', function() {
                if (group.shortName && group.shortName !== '未知' && callbacks.onLocationClick) {
                    callbacks.onLocationClick(group.shortName);
                }
            });
        });

        markerCluster.addLayers(markers);
        map.addLayer(markerCluster);

        // 暴露方法
        self.map = map;
        self.markersMap = markersMap;

        self.resetView = function() {
            map.setView([37.87, 112.55], 3);
        };

        self.flyToMarker = function(locationName) {
            var marker = markersMap[locationName];
            if (marker) {
                map.setView(marker.getLatLng(), 10, { animate: true });
                marker.openPopup();
            }
        };

        self.destroy = function() {
            map.remove();
        };

        return self;
    };

})();