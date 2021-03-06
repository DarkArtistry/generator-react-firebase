<% if (!includeRedux || (includeRedux && !includeFirestore)) { %>import * as admin from 'firebase-admin'
const userId = 1
const refParam = `users_public/${userId}`

describe('indexUser Cloud Function', () => {
  let adminInitStub
  let indexUser

  before(() => {
    /* eslint-disable global-require */
    adminInitStub = sinon.stub(admin, 'initializeApp')
    indexUser = functionsTest.wrap(
      require(`${__dirname}/../../index`).indexUser
    )
    /* eslint-enable global-require */
  })

  after(() => {
    adminInitStub.restore()
    functionsTest.cleanup()
    // admin.database = oldDatabase;
  })

  describe('displayName removed', () => {
    it('exists if displayName was deleted', async () => {
      const databaseStub = sinon.stub()
      const refStub = sinon.stub()
      const removeStub = sinon.stub()

      refStub.withArgs(refParam).returns({ remove: removeStub })
      removeStub.returns(Promise.resolve({ ref: 'new_ref' }))
      databaseStub.returns({ ref: refStub })
      sinon.stub(admin, 'database').get(() => databaseStub)
      const snap = {
        val: () => null
      }
      const fakeContext = {
        params: { filePath: 'testing', userId: 1 }
      }

      const res = await indexUser({ after: snap }, fakeContext)
      expect(res).to.be.null
    })

    it('throws for errors removing name from index', async () => {
      const databaseStub = sinon.stub()
      const refStub = sinon.stub()
      const removeStub = sinon.stub()

      refStub.withArgs(refParam).returns({ remove: removeStub })
      removeStub.returns(Promise.reject('error')) // eslint-disable-line prefer-promise-reject-errors
      databaseStub.returns({ ref: refStub })
      sinon.stub(admin, 'database').get(() => databaseStub)
      const snap = {
        val: () => null
      }
      const fakeContext = {
        params: { filePath: 'testing', userId: 1 }
      }
      try {
        await indexUser({ after: snap }, fakeContext)
      } catch (err) {
        expect(err).to.equal('error')
      }
    })
  })

  describe('displayName changed', () => {
    it('Indexes User within users_public/{userId}', () => {
      const databaseStub = sinon.stub()
      const refStub = sinon.stub()
      const updateStub = sinon.stub()

      refStub.withArgs(refParam).returns({ update: updateStub })
      updateStub.returns(Promise.resolve({ ref: 'new_ref' }))
      databaseStub.returns({ ref: refStub })
      sinon.stub(admin, 'database').get(() => databaseStub)

      const before = {
        val: () => ({ displayName: 'some' })
      }
      const after = {
        val: () => ({ displayName: 'other' })
      }
      const fakeContext = {
        params: { filePath: 'testing', userId: 1 }
      }
      // Invoke webhook with our fake request and response objects. This will cause the
      // assertions in the response object to be evaluated.
      return indexUser({ before, after }, fakeContext)
    })

    it('throws if error updating index with displayName', async () => {
      const databaseStub = sinon.stub()
      const refStub = sinon.stub()
      const updateStub = sinon.stub()

      refStub.withArgs(refParam).returns({ update: updateStub })
      updateStub.returns(Promise.reject('error')) // eslint-disable-line prefer-promise-reject-errors
      databaseStub.returns({ ref: refStub })
      sinon.stub(admin, 'database').get(() => databaseStub)

      const after = {
        val: () => ({ displayName: 'other' })
      }
      const fakeContext = {
        params: { filePath: 'testing', userId: 1 }
      }
      // Invoke webhook with our fake request and response objects. This will cause the
      // assertions in the response object to be evaluated.
      try {
        await indexUser({ after }, fakeContext)
      } catch (err) {
        expect(err).to.equal('error')
      }
    })
  })

  it('exists if displayName did not change', () => {
    const databaseStub = sinon.stub()
    const refStub = sinon.stub()
    const updateStub = sinon.stub()

    refStub.withArgs(refParam).returns({ update: updateStub })
    updateStub.returns(Promise.resolve({ ref: 'new_ref' }))
    databaseStub.returns({ ref: refStub })
    sinon.stub(admin, 'database').get(() => databaseStub)

    const snap = {
      val: () => ({ displayName: 'some' })
    }
    const fakeContext = {
      params: { filePath: 'testing', userId: 1 }
    }

    return indexUser({ before: snap, after: snap }, fakeContext)
  })
})<% } %><% if (includeRedux && includeFirestore) { %>const firebasemock = require('firebase-mock')
let mockauth = new firebasemock.MockFirebase()
let mockdatabase = new firebasemock.MockFirebase()
let mockfirestore = new firebasemock.MockFirestore()
let mocksdk = firebasemock.MockFirebaseSdk(
  function() {
    return mockdatabase
  },
  function() {
    return mockauth
  },
  function() {
    return mockfirestore
  }
)

let mockapp = mocksdk.initializeApp()

describe('indexUser Cloud Function', () => {
  let myFunctions
  let configStub
  let adminInitStub
  let functions

  beforeEach(() => {
    // Since index.js makes calls to functions.config and admin.initializeApp at the top of the file,
    // we need to stub both of these functions before requiring index.js. This is because the
    // functions will be executed as a part of the require process.
    // Here we stub admin.initializeApp to be a dummy function that doesn't do anything.
    /* eslint-disable global-require */
    process.env.GCLOUD_PROJECT = 'FakeProjectId'
    mockdatabase = new firebasemock.MockFirebase()
    mockauth = new firebasemock.MockFirebase()
    mockfirestore = new firebasemock.MockFirestore()
    adminInitStub = sinon.stub(mocksdk, 'initializeApp')
    // Next we stub functions.config(). Normally config values are loaded from Cloud Runtime Config;
    // here we'll just provide some fake values for firebase.databaseURL and firebase.storageBucket
    // so that an error is not thrown during admin.initializeApp's parameter check
    functions = require('firebase-functions')
    configStub = sinon.stub(functions, 'config').returns({
      firebase: {
        databaseURL: 'https://not-a-project.firebaseio.com',
        storageBucket: 'not-a-project.appspot.com',
        projectId: 'not-a-project.appspot',
        messagingSenderId: '823357791673'
      }
      // You can stub any other config values needed by your functions here, for example:
      // foo: 'bar'
    })
    // Now we require index.js and save the exports inside a namespace called myFunctions
    // if we use ../ without dirname here, it can not be run with --prefix from parent folder
    myFunctions = require(`${__dirname}/../../index`)
    mockdatabase.autoFlush()
    mockauth.autoFlush()
    mockfirestore.autoFlush()
    /* eslint-enable global-require */
  })

  afterEach(() => {
    // Restoring stubs to the original methods
    configStub.restore()
    adminInitStub.restore()
  })

  it('adds display name if it did not exist before', async () => {
    const fakeEvent = {
      data: new firebasemock.DeltaDocumentSnapshot(
        mockapp,
        null,
        {
          displayName: 'bob',
          createdTime: new Date()
        },
        'users/123'
      ),
      params: {
        userId: '123ABC'
      }
    }
    // Invoke function with fake event
    try {
      await myFunctions.indexUser(fakeEvent)
    } catch (err) {
      expect(err).to.exist
      expect(
        err.message.indexOf('The project not-a-project.appspot does not exist')
      ).to.not.equal(-1)
    }
  })

  it('returns null if display name is not changed', async () => {
    const fakeEvent = {
      // The DeltaSnapshot constructor is used by the Functions SDK to transform a raw event from
      // your database into an object with utility functions such as .val().
      // Its signature is: DeltaSnapshot(app: firebase.app.App, adminApp: firebase.app.App,
      // data: any, delta: any, path?: string);
      // We can pass null for the first 2 parameters. The data parameter represents the state of
      // the database item before the event, while the delta parameter represents the change that
      // occured to cause the event to fire. The last parameter is the database path, which we are
      // not making use of in this test. So we will omit it.
      data: new firebasemock.DeltaDocumentSnapshot(
        mockapp,
        {
          displayName: 'bob',
          createdTime: new Date() + 50
        },
        {
          displayName: 'bob',
          createdTime: new Date()
        },
        'users/123'
      ),
      params: {
        userId: '123ABC'
      }
    }
    // Invoke webhook with our fake request and response objects. This will cause the
    // assertions in the response object to be evaluated.
    const res = await myFunctions.indexUser(fakeEvent)
    expect(res).to.be.null
  })
})

<% } %>
