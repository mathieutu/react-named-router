import { ComponentType } from 'react';
import { createMemoryHistory } from 'history';

import { NamedRouteConfig } from '../NamedRouter';
import {
  mapRoutes,
  buildRoutingContext,
  buildRoutePath,
  ExtendedRouteConfig,
  BaseRoutingContext,
  RoutingContext,
} from '../utils';

describe('Utils', () => {
  describe('#mapRoutes()', () => {
    it('should return a map containing flattened routes', () => {
      // Given
      const childRoute = {
        name: 'child',
        path: '/parent/child',
      };
      const routes: NamedRouteConfig[] = [
        {
          name: 'parent',
          path: '/parent',
          routes: [childRoute],
        },
      ];

      // When
      const map = mapRoutes(routes);

      // Then
      expect(map.get('parent')).toEqual({
        ...routes[0],
        parents: [],
        regex: /^\/parent\/?$/,
      });
      expect(map.get('child')).toEqual({
        ...childRoute,
        parents: ['parent'],
        regex: /^\/parent\/child\/?$/,
      });
    });

    it('should throw if path is given for a route but no name', () => {
      // Given
      const routes = [{ path: '/route-without-name' }];

      // Then
      expect(() => mapRoutes(routes)).toThrow(new Error('Route /route-without-name has no name'));
    });

    it('should warn when registering a route twice', () => {
      // Given
      const routes = [{ name: 'duplicate', path: '/route1' }, { name: 'duplicate', path: '/route2' }];
      const consoleMock = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // When
      mapRoutes(routes);

      // Then
      expect(consoleMock).toHaveBeenCalledWith('Duplicate definition for route duplicate:\n- /route1\n- /route2');
      consoleMock.mockRestore();
    });

    it('should ignore unnamed route without path', () => {
      // Given
      const routes: NamedRouteConfig<{ component: ComponentType<any> }>[] = [{ component: jest.fn() }];

      // When
      const map = mapRoutes(routes);

      // Then
      expect(map.size).toEqual(0);
    });
  });

  describe('#buildRoutingContext()', () => {
    it('should return base context if no history is provided', () => {
      // When
      const context = buildRoutingContext([], {} as any);

      // Then
      expect(context).toBeInstanceOf(BaseRoutingContext);
    });

    it('should return full context if history is provided', () => {
      // When
      const context = buildRoutingContext([], {} as any, createMemoryHistory());

      // Then
      expect(context).toBeInstanceOf(RoutingContext);
    });
  });

  describe('BaseRoutingContext', () => {
    const routesMap = new Map<string, ExtendedRouteConfig>([['test', {
      path: '/test',
      regex: /^\/test$/,
      parents: [],
    }]]);

    describe('#getPath()', () => {
      it('should return path for given route name', () => {
        // Given
        const baseRoutingContext = new BaseRoutingContext(routesMap, {} as any);

        // When
        const path = baseRoutingContext.getPath('test');

        // Then
        expect(path).toEqual('/test');
      });
    });

    describe('#getRoute()', () => {
      it('should return path for given route name', () => {
        // Given
        const baseRoutingContext = new BaseRoutingContext(routesMap, {} as any);

        // When
        const route = baseRoutingContext.getRoute('test');

        // Then
        expect(route).toEqual(routesMap.get('test'));
      });

      it('should throw if route does not exist', () => {
        // Given
        const baseRoutingContext = new BaseRoutingContext(routesMap, {} as any);

        // Then
        expect(() => baseRoutingContext.getRoute('invalid')).toThrow(new Error('Undefined route "invalid"'));
      });
    });

    describe('#match()', () => {
      it('should match route for given pathname', () => {
        // Given
        const baseRoutingContext = new BaseRoutingContext(routesMap, {} as any);

        // When
        const match = baseRoutingContext.match('/test');

        // Then
        expect(match).toEqual(routesMap.get('test'));
      });
    });
  });

  describe('RoutingContext', () => {
    const routesMap = new Map<string, ExtendedRouteConfig>([['test', {
      path: '/test',
      regex: /^\/test$/,
      parents: [],
    }]]);

    describe('#push()', () => {
      it('should call push on history with matching route', () => {
        // Given
        const history = createMemoryHistory();
        const routingContext = new RoutingContext(routesMap, {} as any, history);
        const historyPushMock = jest.spyOn(history, 'push');

        // When
        routingContext.push('test');

        // Then
        expect(historyPushMock).toHaveBeenCalledWith('/test');
      });
    });

    describe('#replace()', () => {
      it('should call replace on history with matching route', () => {
        // Given
        const history = createMemoryHistory();
        const routingContext = new RoutingContext(routesMap, {} as any, history);
        const historyReplaceMock = jest.spyOn(history, 'replace');

        // When
        routingContext.replace('test');

        // Then
        expect(historyReplaceMock).toHaveBeenCalledWith('/test');
      });
    });
  });

  describe('#buildRoutePath()', () => {
    it('should return built path for given route', () => {
      // Given
      const map = new Map<string, ExtendedRouteConfig>([['test', {
        path: '/test/:param',
        regex: /^\/test$/,
        parents: [],
      }]]);

      // When
      const path = buildRoutePath(map, 'test', { param: 1234 });

      // Then
      expect(path).toEqual('/test/1234');
    });

    it('should remove trailing slash if optional param not given', () => {
      // Given
      const map = new Map<string, ExtendedRouteConfig>([['test', {
        path: '/test/:param?',
        regex: /^\/test$/,
        parents: [],
      }]]);

      // When
      const path = buildRoutePath(map, 'test');

      // Then
      expect(path).toEqual('/test');
    });

    it('should throw if route does not exist', () => {
      expect(() => buildRoutePath(new Map(), 'invalid')).toThrow(new Error('Undefined route "invalid"'));
    });

    it('should throw if route has no path', () => {
      // Given
      const map = new Map<string, ExtendedRouteConfig>([
        ['missingPath', { name: 'missingPath', regex: /^$/, parents: [] }],
      ]);

      // Then
      expect(() => buildRoutePath(map, 'missingPath')).toThrow(new Error('Route "missingPath" does not have a path'));
    });

    it('should throw if no value is provided for required param', () => {
      // Given
      const map = new Map<string, ExtendedRouteConfig>([['routeWithParam', {
        name: 'routeWithParam',
        path: '/path/with/:param',
        regex: /^$/,
        parents: [],
      }]]);

      // Then
      expect(() => buildRoutePath(map, 'routeWithParam'))
        .toThrow(new Error('Missing value for required param "param"'));
    });
  });
});
