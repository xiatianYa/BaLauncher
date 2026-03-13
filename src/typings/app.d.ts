/** The global namespace for the app */
declare namespace App {
  /** Theme namespace */
  namespace Theme {

    /** Theme setting */
    interface ThemeSetting {
      /** Theme scheme */
      themeScheme: UnionKey.ThemeScheme;
      /** Layout */
      layout: {
        /** Layout mode */
        mode: UnionKey.ThemeLayoutMode;
      };
    }

    interface OtherColor {
      info: string;
      success: string;
      warning: string;
      error: string;
    }

    interface ThemeColor extends OtherColor {
      primary: string;
    }

    type ThemeColorKey = keyof ThemeColor;

    type ThemePaletteColor = {
      [key in ThemeColorKey | `${ThemeColorKey}-${ColorPaletteNumber}`]: string;
    };

    type BaseToken = Record<string, Record<string, string>>;

    interface ThemeSettingTokenColor {
      /** the progress bar color, if not set, will use the primary color */
      nprogress?: string;
      container: string;
      layout: string;
      inverted: string;
      'base-text': string;
    }

    interface ThemeSettingTokenBoxShadow {
      header: string;
      sider: string;
      tab: string;
    }

    interface ThemeSettingToken {
      colors: ThemeSettingTokenColor;
      boxShadow: ThemeSettingTokenBoxShadow;
    }

    type ThemeTokenColor = ThemePaletteColor & ThemeSettingTokenColor;

    /** Theme token CSS variables */
    type ThemeTokenCSSVars = {
      colors: ThemeTokenColor & { [key: string]: string };
      boxShadow: ThemeSettingTokenBoxShadow & { [key: string]: string };
    };
  }
  /** Global namespace */
  namespace Global {
    /** The router push options */
    type RouterPushOptions = {
      query?: Record<string, string>;
      params?: Record<string, string>;
    };

    /** Form rule */
    type FormRule = import('naive-ui').FormItemRule;
  }
  /**
 * I18n namespace
 *
 * Locales type
 */
  namespace I18n {
    type I18nKey = GetI18nKey<Schema>;

    type LangType = 'en-US' | 'zh-CN';

    type LangOption = {
      label: string;
      key: LangType;
    };

    type Schema = {
      system: {
        title: string;
        updateTitle: string;
        updateContent: string;
        updateConfirm: string;
        updateCancel: string;
      };
      common: {
        action: string;
        add: string;
        addSuccess: string;
        backToHome: string;
        batchDelete: string;
        cancel: string;
        close: string;
        check: string;
        expandColumn: string;
        columnSetting: string;
        config: string;
        confirm: string;
        delete: string;
        deleteSuccess: string;
        confirmDelete: string;
        edit: string;
        warning: string;
        error: string;
        index: string;
        keywordSearch: string;
        logout: string;
        logoutConfirm: string;
        lookForward: string;
        modify: string;
        modifySuccess: string;
        noData: string;
        operate: string;
        pleaseCheckValue: string;
        refresh: string;
        reset: string;
        search: string;
        switch: string;
        tip: string;
        trigger: string;
        update: string;
        updateSuccess: string;
        userCenter: string;
        yesOrNo: {
          yes: string;
          no: string;
        };
      };
      request: {
        logout: string;
        logoutMsg: string;
        logoutWithModal: string;
        logoutWithModalMsg: string;
        refreshToken: string;
        tokenExpired: string;
      };
      theme: {
        themeSchema: { title: string } & Record<UnionKey.ThemeScheme, string>;
        grayscale: string;
        colourWeakness: string;
        layoutMode: { title: string; reverseHorizontalMix: string } & Record<UnionKey.ThemeLayoutMode, string>;
        recommendColor: string;
        recommendColorDesc: string;
        themeColor: {
          title: string;
          followPrimary: string;
        } & Theme.ThemeColor;
        scrollMode: { title: string } & Record<UnionKey.ThemeScrollMode, string>;
        page: {
          animate: string;
          mode: { title: string } & Record<UnionKey.ThemePageAnimateMode, string>;
        };
        fixedHeaderAndTab: string;
        header: {
          height: string;
          breadcrumb: {
            visible: string;
            showIcon: string;
          };
          multilingual: {
            visible: string;
          };
          globalSearch: {
            visible: string;
          };
        };
        tab: {
          visible: string;
          cache: string;
          height: string;
          mode: { title: string } & Record<UnionKey.ThemeTabMode, string>;
        };
        sider: {
          inverted: string;
          width: string;
          collapsedWidth: string;
          mixWidth: string;
          mixCollapsedWidth: string;
          mixChildMenuWidth: string;
        };
        footer: {
          visible: string;
          fixed: string;
          height: string;
          right: string;
        };
        watermark: {
          visible: string;
          text: string;
          enableUserName: string;
        };
        themeDrawerTitle: string;
        pageFunTitle: string;
        resetCacheStrategy: { title: string } & Record<UnionKey.ResetCacheStrategy, string>;
        configOperation: {
          copyConfig: string;
          copySuccessMsg: string;
          resetConfig: string;
          resetSuccessMsg: string;
        };
      };
      route: Record<I18nRouteKey, string>;
      page: {
        login: {
          common: {
            loginOrRegister: string;
            userNamePlaceholder: string;
            userNickNamePlaceholder: string;
            phonePlaceholder: string;
            codePlaceholder: string;
            passwordPlaceholder: string;
            confirmPasswordPlaceholder: string;
            codeLogin: string;
            confirm: string;
            back: string;
            validateSuccess: string;
            loginSuccess: string;
            welcomeBack: string;
            registerSuccess: string;
            getCodePlaceholder: string;
          };
          pwdLogin: {
            title: string;
            rememberMe: string;
            forgetPassword: string;
            register: string;
            otherAccountLogin: string;
            otherLoginMode: string;
            superAdmin: string;
            admin: string;
            user: string;
            qq: string;
          };
          codeLogin: {
            title: string;
            getCode: string;
            reGetCode: string;
            sendCodeSuccess: string;
            imageCodePlaceholder: string;
          };
          register: {
            title: string;
            agreement: string;
            protocol: string;
            policy: string;
          };
          resetPwd: {
            title: string;
          };
          bindWeChat: {
            title: string;
          };
        };
        home: {
          branchDesc: string;
          greeting: string;
          weatherDesc: string;
          projectCount: string;
          todo: string;
          message: string;
          downloadCount: string;
          registerCount: string;
          schedule: string;
          study: string;
          work: string;
          rest: string;
          entertainment: string;
          visitCount: string;
          turnover: string;
          dealCount: string;
          projectNews: {
            title: string;
            moreNews: string;
            desc1: string;
            desc2: string;
            desc3: string;
            desc4: string;
            desc5: string;
          };
          creativity: string;
        };
        manage: {
          common: {
            status: {
              enable: string;
              disable: string;
            };
          };
          role: {
            title: string;
            roleName: string;
            roleCode: string;
            roleStatus: string;
            roleDesc: string;
            form: {
              roleName: string;
              roleCode: string;
              roleStatus: string;
              roleDesc: string;
            };
            addRole: string;
            editRole: string;
            menuAuth: string;
            buttonAuth: string;
          };
          user: {
            title: string;
            userName: string;
            userGender: string;
            nickName: string;
            userPhone: string;
            userEmail: string;
            userStatus: string;
            userRole: string;
            form: {
              userName: string;
              userGender: string;
              nickName: string;
              userPhone: string;
              userEmail: string;
              userStatus: string;
              userRole: string;
            };
            addUser: string;
            editUser: string;
            gender: {
              male: string;
              female: string;
            };
          };
          menu: {
            home: string;
            title: string;
            id: string;
            parentId: string;
            menuType: string;
            menuName: string;
            routeName: string;
            routePath: string;
            pathParam: string;
            layout: string;
            page: string;
            i18nKey: string;
            icon: string;
            localIcon: string;
            iconTypeTitle: string;
            order: string;
            constant: string;
            keepAlive: string;
            href: string;
            hideInMenu: string;
            activeMenu: string;
            multiTab: string;
            fixedIndexInTab: string;
            query: string;
            button: string;
            buttonCode: string;
            buttonDesc: string;
            menuStatus: string;
            form: {
              home: string;
              menuType: string;
              menuName: string;
              routeName: string;
              routePath: string;
              pathParam: string;
              layout: string;
              page: string;
              i18nKey: string;
              icon: string;
              localIcon: string;
              order: string;
              keepAlive: string;
              href: string;
              hideInMenu: string;
              activeMenu: string;
              multiTab: string;
              fixedInTab: string;
              fixedIndexInTab: string;
              queryKey: string;
              queryValue: string;
              button: string;
              buttonCode: string;
              buttonDesc: string;
              menuStatus: string;
            };
            addMenu: string;
            editMenu: string;
            addChildMenu: string;
            type: {
              directory: string;
              menu: string;
            };
            iconType: {
              iconify: string;
              local: string;
            };
          };
          dict: {
            title: string;
            name: string;
            code: string;
            type: string;
            sort: string;
            description: string;
            status: string;
            form: {
              name: string;
              code: string;
              type: string;
              sort: string;
              description: string;
              status: string;
            };
            addDict: string;
            editDict: string;
            dictType: {
              system: string;
              business: string;
            };
            loadCacheSuccess: string;
            selectTreeIsEmptyTip: string;
            systemFieldsCannotBeDeleted: string;
          };
          dictItem: {
            title: string;
            dictCode: string;
            value: string;
            zhCN: string;
            enUS: string;
            sort: string;
            type: string;
            color: string;
            description: string;
            status: string;
            form: {
              value: string;
              zhCN: string;
              enUS: string;
              sort: string;
              type: string;
              color: string;
              description: string;
              status: string;
            };
            addDictItem: string;
            editDictItem: string;
          };
        };
        monitor: {
          percentage: string;
          scheduler: {
            title: string;
            jobName: string;
            jobGroup: string;
            triggerName: string;
            triggerGroup: string;
            jobData: string;
            triggerData: string;
            addScheduler: string;
            editScheduler: string;
            corn: string;
            jobClassName: string;
            status: string;
            form: {
              jobName: string;
              jobGroup: string;
              triggerName: string;
              triggerGroup: string;
              jobData: string;
              triggerData: string;
              corn: string;
              jobClassName: string;
              status: string;
            };
          };
          system: {
            status: string;
            cpuUserUsage: string;
            cpuSystemUsage: string;
            systemMemoryUsage: string;
            jvmMemoryUsage: string;
            operatingSystem: {
              title: string;
              name: string;
              manufacturer: string;
              arch: string;
              systemBootTime: string;
              systemUptime: string;
            };
            centralProcessor: {
              title: string;
              name: string;
              physicalProcessorCount: string;
              logicalProcessorCount: string;
              processorIdentifier: string;
              vendorFreq: string;
              userPercent: string;
              systemPercent: string;
              idlePercent: string;
            };
            globalMemory: {
              title: string;
              total: string;
              used: string;
              available: string;
              swapTotal: string;
              swapUsed: string;
              swapFree: string;
              memoryUsedRate: string;
              swapUsedRate: string;
            };
            jvm: {
              title: string;
              vmName: string;
              uptime: string;
              vmVersion: string;
              vmVendor: string;
              startTime: string;
              inputArguments: string;
              heapMemoryUsed: string;
              heapMemoryMax: string;
              memoryUsageRate: string;
              nonHeapMemoryUsed: string;
            };
            fileStore: {
              title: string;
              name: string;
              type: string;
              mount: string;
              totalSpace: string;
              usableSpace: string;
              usedSpace: string;
              usedPercentage: string;
            };
            process: {
              title: string;
              processID: string;
              name: string;
              cpuLoad: string;
            };
          };
          cache: {
            redis: {
              title: string;
              version: string;
              uptime: string;
              connectedClients: string;
              usedMemory: string;
              maxMemory: string;
              memoryUsageRate: string;
              memFragmentationRatio: string;
              totalCommandsProcessed: string;
              echartsTitle: string;
              echartsSubTitle: string;
            };
          };
          logs: {
            login: {
              userName: string;
              userRealName: string;
              ip: string;
              ipAddr: string;
              userAgent: string;
              status: string;
              message: string;
              createTime: string;
              createUser: string;
              form: {
                userName: string;
                userRealName: string;
              };
              loginStatus: {
                fail: string;
                success: string;
              };
            };
            operation: {
              requestId: string;
              ip: string;
              ipAddr: string;
              userAgent: string;
              requestUri: string;
              requestMethod: string;
              contentType: string;
              operation: string;
              methodName: string;
              methodParams: string;
              useTime: string;
              createUser: string;
              createTime: string;
              form: {
                createUser: string;
              };
            };
            error: {
              requestId: string;
              ip: string;
              ipAddr: string;
              userAgent: string;
              requestUri: string;
              requestMethod: string;
              contentType: string;
              operation: string;
              methodName: string;
              methodParams: string;
              useTime: string;
              createUser: string;
              createTime: string;
              exceptionMessage: string;
              exceptionClass: string;
              line: string;
              stackTrace: string;
              form: {
                createUser: string;
              };
            };
            scheduler: {
              jobName: string;
              jobGroup: string;
              useTime: string;
              status: string;
              createTime: string;
              exceptionMessage: string;
              exceptionClass: string;
              line: string;
              stackTrace: string;
              executeStatus: {
                success: string;
                fail: string;
              };
              form: {
                jobName: string;
              };
            };
            file: {
              userId: string;
              userName: string;
              fileUrl: string;
              fileSize: string;
              status: string;
              form: {
                userId: string;
                userName: string;
                fileUrl: string;
                fileSize: string;
                status: string;
              };
            };
          };
        };
        game: {
          community: {
            addCommunity: string;
            editCommunity: string;
            communityName: string;
            logo: string;
            website: string;
            bind: string;
            form: {
              communityName: string;
              logo: string;
              website: string;
              bind: string;
            };
          };
          server: {
            serverName: string;
            communityId: string;
            ip: string;
            port: string;
            addServer: string;
            editServer: string;
            players: string;
            addr: string;
            version: string;
            connectStr: string;
            isStatistics: string;
            isQuery: string;
            form: {
              serverName: string;
              communityId: string;
              ip: string;
              port: string;
              connectStr: string;
              isStatistics: string;
              isQuery: string;
            };
          };
          map: {
            mapName: string;
            mapLabel: string;
            mapUrl: string;
            type: string;
            tag: string;
            artifact: string;
            addMap: string;
            editMap: string;
            mapCd: string;
            mapAchievement: string;
            form: {
              mapName: string;
              mapLabel: string;
              mapUrl: string;
              type: string;
              tag: string;
              artifact: string;
              desc: string;
            };
          };
        };
      };
      form: {
        required: string;
        userName: FormMsg;
        nickName: FormMsg;
        avatar: FormMsg;
        phone: FormMsg;
        pwd: FormMsg;
        confirmPwd: FormMsg;
        code: FormMsg;
        email: FormMsg;
      };
      dropdown: Record<Global.DropdownKey, string>;
      icon: {
        themeConfig: string;
        themeSchema: string;
        lang: string;
        fullscreen: string;
        fullscreenExit: string;
        reload: string;
        collapse: string;
        expand: string;
        pin: string;
        unpin: string;
      };
      datatable: {
        itemCount: string;
      };
    };

    interface $T {
      (key: I18nKey): string;
      (key: I18nKey, plural: number, options?: TranslateOptions<LangType>): string;
      (key: I18nKey, defaultMsg: string, options?: TranslateOptions<I18nKey>): string;
      (key: I18nKey, list: unknown[], options?: TranslateOptions<I18nKey>): string;
      (key: I18nKey, list: unknown[], plural: number): string;
      (key: I18nKey, list: unknown[], defaultMsg: string): string;
      (key: I18nKey, named: Record<string, unknown>, options?: TranslateOptions<LangType>): string;
      (key: I18nKey, named: Record<string, unknown>, plural: number): string;
      (key: I18nKey, named: Record<string, unknown>, defaultMsg: string): string;
    }
  }
}
