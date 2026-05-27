import { getUncachableRevenueCatClient } from "./revenueCatClient";

import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listAppPublicApiKeys,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  type App,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_NAME = "GoalGetter";

const APP_STORE_APP_NAME = "GoalGetter iOS";
const APP_STORE_BUNDLE_ID = "com.goalgetter.app";
const PLAY_STORE_APP_NAME = "GoalGetter Android";
const PLAY_STORE_PACKAGE_NAME = "com.goalgetter.app";

const ENTITLEMENT_IDENTIFIER = "pro";
const ENTITLEMENT_DISPLAY_NAME = "GoalGetter Pro";

const OFFERING_IDENTIFIER = "default";
const OFFERING_DISPLAY_NAME = "Default Offering";

// Monthly product
const MONTHLY_IDENTIFIER = "pro_monthly";
const MONTHLY_PLAY_STORE_IDENTIFIER = "pro_monthly:monthly";
const MONTHLY_DISPLAY_NAME = "GoalGetter Pro Monthly";
const MONTHLY_TITLE = "GoalGetter Pro Monthly";
const MONTHLY_DURATION = "P1M";
const MONTHLY_PACKAGE_IDENTIFIER = "$rc_monthly";
const MONTHLY_PACKAGE_DISPLAY_NAME = "Monthly";
const MONTHLY_PRICES = [
  { amount_micros: 990000, currency: "USD" },
  { amount_micros: 990000, currency: "EUR" },
];

// Annual product
const ANNUAL_IDENTIFIER = "pro_annual";
const ANNUAL_PLAY_STORE_IDENTIFIER = "pro_annual:annual";
const ANNUAL_DISPLAY_NAME = "GoalGetter Pro Annual";
const ANNUAL_TITLE = "GoalGetter Pro Annual";
const ANNUAL_DURATION = "P1Y";
const ANNUAL_PACKAGE_IDENTIFIER = "$rc_annual";
const ANNUAL_PACKAGE_DISPLAY_NAME = "Annual";
const ANNUAL_PRICES = [
  { amount_micros: 9990000, currency: "USD" },
  { amount_micros: 9990000, currency: "EUR" },
];

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  // ── Project ──────────────────────────────────────────────────────────────
  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });
  if (listProjectsError) throw new Error("Failed to list projects");

  const existingProject = existingProjects.items?.find((p) => p.name === PROJECT_NAME);
  if (existingProject) {
    console.log("Project already exists:", existingProject.id);
    project = existingProject;
  } else {
    const { data: newProject, error } = await createProject({
      client,
      body: { name: PROJECT_NAME },
    });
    if (error) throw new Error("Failed to create project");
    console.log("Created project:", newProject.id);
    project = newProject;
  }

  // ── Apps ─────────────────────────────────────────────────────────────────
  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps || apps.items.length === 0) throw new Error("No apps found");

  let testStoreApp: App | undefined = apps.items.find((a) => a.type === "test_store");
  let appStoreApp: App | undefined = apps.items.find((a) => a.type === "app_store");
  let playStoreApp: App | undefined = apps.items.find((a) => a.type === "play_store");

  if (!testStoreApp) throw new Error("No test store app found");
  console.log("Test store app:", testStoreApp.id);

  if (!appStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: APP_STORE_APP_NAME, type: "app_store", app_store: { bundle_id: APP_STORE_BUNDLE_ID } },
    });
    if (error) throw new Error("Failed to create App Store app");
    appStoreApp = newApp;
    console.log("Created App Store app:", appStoreApp.id);
  } else {
    console.log("App Store app:", appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: PLAY_STORE_APP_NAME, type: "play_store", play_store: { package_name: PLAY_STORE_PACKAGE_NAME } },
    });
    if (error) throw new Error("Failed to create Play Store app");
    playStoreApp = newApp;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app:", playStoreApp.id);
  }

  // ── Products ─────────────────────────────────────────────────────────────
  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  if (listProductsError) throw new Error("Failed to list products");

  const ensureProduct = async (
    targetApp: App,
    label: string,
    identifier: string,
    displayName: string,
    title: string,
    duration: string,
    isTestStore: boolean,
  ): Promise<Product> => {
    const existing = existingProducts.items?.find(
      (p) => p.store_identifier === identifier && p.app_id === targetApp.id,
    );
    if (existing) {
      console.log(label + " product already exists:", existing.id);
      return existing;
    }
    const body: CreateProductData["body"] = {
      store_identifier: identifier,
      app_id: targetApp.id,
      type: "subscription",
      display_name: displayName,
    };
    if (isTestStore) {
      body.subscription = { duration };
      body.title = title;
    }
    const { data: created, error } = await createProduct({ client, path: { project_id: project.id }, body });
    if (error) throw new Error("Failed to create " + label + " product: " + JSON.stringify(error));
    console.log("Created " + label + " product:", created.id);
    return created;
  };

  const testMonthly = await ensureProduct(testStoreApp, "Test/Monthly", MONTHLY_IDENTIFIER, MONTHLY_DISPLAY_NAME, MONTHLY_TITLE, MONTHLY_DURATION, true);
  const iosMonthly = await ensureProduct(appStoreApp, "iOS/Monthly", MONTHLY_IDENTIFIER, MONTHLY_DISPLAY_NAME, MONTHLY_TITLE, MONTHLY_DURATION, false);
  const androidMonthly = await ensureProduct(playStoreApp, "Android/Monthly", MONTHLY_PLAY_STORE_IDENTIFIER, MONTHLY_DISPLAY_NAME, MONTHLY_TITLE, MONTHLY_DURATION, false);

  const testAnnual = await ensureProduct(testStoreApp, "Test/Annual", ANNUAL_IDENTIFIER, ANNUAL_DISPLAY_NAME, ANNUAL_TITLE, ANNUAL_DURATION, true);
  const iosAnnual = await ensureProduct(appStoreApp, "iOS/Annual", ANNUAL_IDENTIFIER, ANNUAL_DISPLAY_NAME, ANNUAL_TITLE, ANNUAL_DURATION, false);
  const androidAnnual = await ensureProduct(playStoreApp, "Android/Annual", ANNUAL_PLAY_STORE_IDENTIFIER, ANNUAL_DISPLAY_NAME, ANNUAL_TITLE, ANNUAL_DURATION, false);

  // ── Test store prices ────────────────────────────────────────────────────
  const addPrices = async (product: Product, prices: typeof MONTHLY_PRICES, label: string) => {
    const { error } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: product.id },
      body: { prices },
    });
    if (error) {
      if (typeof error === "object" && "type" in error && (error as { type: string }).type === "resource_already_exists") {
        console.log(label + " prices already exist");
      } else {
        throw new Error("Failed to add " + label + " prices: " + JSON.stringify(error));
      }
    } else {
      console.log("Added " + label + " prices");
    }
  };
  await addPrices(testMonthly, MONTHLY_PRICES, "monthly test store");
  await addPrices(testAnnual, ANNUAL_PRICES, "annual test store");

  // ── Entitlement ──────────────────────────────────────────────────────────
  let entitlement: Entitlement;
  const { data: existingEntitlements, error: listEntitlementsError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listEntitlementsError) throw new Error("Failed to list entitlements");

  const existingEntitlement = existingEntitlements.items?.find((e) => e.lookup_key === ENTITLEMENT_IDENTIFIER);
  if (existingEntitlement) {
    console.log("Entitlement already exists:", existingEntitlement.id);
    entitlement = existingEntitlement;
  } else {
    const { data: newEnt, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: { lookup_key: ENTITLEMENT_IDENTIFIER, display_name: ENTITLEMENT_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create entitlement");
    console.log("Created entitlement:", newEnt.id);
    entitlement = newEnt;
  }

  const allProductIds = [testMonthly.id, iosMonthly.id, androidMonthly.id, testAnnual.id, iosAnnual.id, androidAnnual.id];
  const { error: attachEntError } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
    body: { product_ids: allProductIds },
  });
  if (attachEntError) {
    if ((attachEntError as { type?: string }).type === "unprocessable_entity_error") {
      console.log("Products already attached to entitlement");
    } else {
      throw new Error("Failed to attach products to entitlement: " + JSON.stringify(attachEntError));
    }
  } else {
    console.log("Attached all products to entitlement");
  }

  // ── Offering ─────────────────────────────────────────────────────────────
  let offering: Offering;
  const { data: existingOfferings, error: listOfferingsError } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listOfferingsError) throw new Error("Failed to list offerings");

  const existingOffering = existingOfferings.items?.find((o) => o.lookup_key === OFFERING_IDENTIFIER);
  if (existingOffering) {
    console.log("Offering already exists:", existingOffering.id);
    offering = existingOffering;
  } else {
    const { data: newOff, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: { lookup_key: OFFERING_IDENTIFIER, display_name: OFFERING_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create offering");
    console.log("Created offering:", newOff.id);
    offering = newOff;
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error("Failed to set offering as current");
    console.log("Set offering as current");
  }

  // ── Packages ─────────────────────────────────────────────────────────────
  const { data: existingPackages, error: listPkgError } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 20 },
  });
  if (listPkgError) throw new Error("Failed to list packages");

  const ensurePackage = async (lookupKey: string, displayName: string): Promise<Package> => {
    const existing = existingPackages.items?.find((p) => p.lookup_key === lookupKey);
    if (existing) {
      console.log("Package already exists:", existing.id, lookupKey);
      return existing;
    }
    const { data: pkg, error } = await createPackages({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { lookup_key: lookupKey, display_name: displayName },
    });
    if (error) throw new Error("Failed to create package " + lookupKey + ": " + JSON.stringify(error));
    console.log("Created package:", pkg.id, lookupKey);
    return pkg;
  };

  const monthlyPkg = await ensurePackage(MONTHLY_PACKAGE_IDENTIFIER, MONTHLY_PACKAGE_DISPLAY_NAME);
  const annualPkg = await ensurePackage(ANNUAL_PACKAGE_IDENTIFIER, ANNUAL_PACKAGE_DISPLAY_NAME);

  const attachPkg = async (pkg: Package, products: { id: string }[], label: string) => {
    const { error } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
      body: { products: products.map((p) => ({ product_id: p.id, eligibility_criteria: "all" })) },
    });
    if (error) {
      if ((error as { type?: string; message?: string }).type === "unprocessable_entity_error") {
        console.log(label + ": products already attached or incompatible — skipping");
      } else {
        throw new Error("Failed to attach products to " + label + ": " + JSON.stringify(error));
      }
    } else {
      console.log("Attached products to " + label);
    }
  };

  await attachPkg(monthlyPkg, [testMonthly, iosMonthly, androidMonthly], "monthly package");
  await attachPkg(annualPkg, [testAnnual, iosAnnual, androidAnnual], "annual package");

  // ── API keys ─────────────────────────────────────────────────────────────
  const getKeys = async (app: App) => {
    const { data, error } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: app.id } });
    if (error) throw new Error("Failed to list API keys for " + app.id);
    return data.items.map((k) => k.key).join(", ");
  };

  const testKeys = await getKeys(testStoreApp);
  const iosKeys = await getKeys(appStoreApp);
  const androidKeys = await getKeys(playStoreApp);

  console.log("\n====================");
  console.log("GoalGetter RevenueCat setup complete!");
  console.log("REVENUECAT_PROJECT_ID=" + project.id);
  console.log("REVENUECAT_TEST_STORE_APP_ID=" + testStoreApp.id);
  console.log("REVENUECAT_APPLE_APP_STORE_APP_ID=" + appStoreApp.id);
  console.log("REVENUECAT_GOOGLE_PLAY_STORE_APP_ID=" + playStoreApp.id);
  console.log("EXPO_PUBLIC_REVENUECAT_TEST_API_KEY=" + testKeys);
  console.log("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=" + iosKeys);
  console.log("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=" + androidKeys);
  console.log("====================\n");
}

seedRevenueCat().catch(console.error);
