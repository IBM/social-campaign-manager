import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { NgModule, ApplicationRef } from '@angular/core';
import { removeNgStyles, createNewHosts, createInputTransfer } from '@angularclass/hmr';
import { RouterModule, PreloadAllModules } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FlashMessagesModule } from 'angular2-flash-messages';

/*
* Platform and Environment providers/directives/pipes
*/
import { ENV_PROVIDERS } from './environment';
import { ROUTES } from './app.routes';
// App is our top level component
import { AppComponent } from './app.component';
import { APP_RESOLVER_PROVIDERS } from './app.resolver';
import { AppState, InternalStateType } from './app.service';
import { NoContentComponent } from './modules/no-content';

/*
* Components and modules
*/
import { NetworkingService } from './services/networking.service';
import { AppWelcomeComponent } from './app-welcome.component';
import { CampaignModule } from './modules/campaign';
import { DirectChatModule } from './modules/direct-chat';
import { AuthGuard } from './services/authguard.service';

/*
* styles
*/
import '../styles/styles.scss';
import '../styles/headings.css';

// Application wide providers
const APP_PROVIDERS = [
    ...APP_RESOLVER_PROVIDERS,
    AppState
];

type StoreType = {
    state: InternalStateType,
    restoreInputValues: () => void,
    disposeOldHosts: () => void
};

/**
* `AppModule` is the main entry point into Angular2's bootstrapping process
*/
@NgModule({
    bootstrap: [AppComponent],
    declarations: [
        AppComponent,
        AppWelcomeComponent,
        NoContentComponent
    ],

    /**
    * Import Angular modules.
    */
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        NgbModule.forRoot(),
        FormsModule,
        HttpModule,
        RouterModule.forRoot(ROUTES, {
            useHash: true,
            preloadingStrategy: PreloadAllModules
        }),
        CampaignModule,
        DirectChatModule,
        FlashMessagesModule.forRoot(),
    ],

    /**
    * Expose our Services and Providers into Angular dependency injection.
    */
    providers: [
        ENV_PROVIDERS,
        APP_PROVIDERS,
        AuthGuard,
        NetworkingService
    ]
})
export class AppModule {

    constructor(
        public appRef: ApplicationRef,
        public appState: AppState
    ) { }

    public hmrOnInit(store: StoreType) {
        if (!store || !store.state) {
            return;
        }
        console.log('HMR store', JSON.stringify(store, null, 2));

        /**
        * Set state
        */
        this.appState._state = store.state;

        /**
        * Set input values
        */
        if ('restoreInputValues' in store) {
            let restoreInputValues = store.restoreInputValues;
            setTimeout(restoreInputValues);
        }

        this.appRef.tick();
        delete store.state;
        delete store.restoreInputValues;
    }

    public hmrOnDestroy(store: StoreType) {
        const cmpLocation = this.appRef.components.map((cmp) => cmp.location.nativeElement);

        /**
        * Save state
        */
        const state = this.appState._state;
        store.state = state;

        /**
        * Recreate root elements
        */
        store.disposeOldHosts = createNewHosts(cmpLocation);

        /**
        * Save input values
        */
        store.restoreInputValues  = createInputTransfer();

        /**
        * Remove styles
        */
        removeNgStyles();
    }

    public hmrAfterDestroy(store: StoreType) {

        /**
        * Display new elements
        */
        store.disposeOldHosts();
        delete store.disposeOldHosts;
    }
}
